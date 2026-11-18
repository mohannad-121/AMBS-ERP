"""Bounded production-image QA. Never connects to the development DB or existing volumes.

Run from repository root after building ambs-containment-{frontend,backend}:qa.
Only generated ambs-containment-* Compose resources are removed.
"""
import json
import os
from pathlib import Path
import secrets
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]


def main():
    suffix = uuid.uuid4().hex
    project = "ambs-containment-" + suffix
    work = ROOT / "artifacts" / project
    work.mkdir(parents=True)
    secret_dir = work / "secrets"
    secret_dir.mkdir()
    for name in ("database_owner_password", "database_password", "bff_secret"):
        (secret_dir / name).write_text(secrets.token_urlsafe(48))
    (secret_dir / "ors_api_key").write_text("")
    # The self-signed certificate and empty ORS key are strictly QA-only.
    config = work / "openssl.cnf"
    config.write_text("[req]\ndistinguished_name=dn\n[dn]\n")
    subprocess.run([os.environ.get("OPENSSL_EXECUTABLE", "openssl"), "req", "-config", str(config), "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=localhost", "-keyout", str(secret_dir / "tls_private_key"), "-out", str(secret_dir / "tls_certificate")], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    values = {
        "PRODUCTION_DB_NAME": "ambs_http_test_" + suffix,
        "PRODUCTION_DB_OWNER": "ambs_qa_owner",
        "PRODUCTION_DB_RUNTIME_USER": "ambs_runtime",
        "PRODUCTION_ALLOWED_ORIGINS": '["https://127.0.0.1:8443"]',
        "PRODUCTION_HTTPS_PORT": "18443",
        "PRODUCTION_BIND_ADDRESS": "127.0.0.1",
    }
    for key, name in {"DB_OWNER_PASSWORD": "database_owner_password", "DB_PASSWORD": "database_password", "BFF_SECRET": "bff_secret", "ORS_KEY": "ors_api_key", "TLS_CERTIFICATE": "tls_certificate", "TLS_PRIVATE_KEY": "tls_private_key"}.items():
        values["PRODUCTION_" + key + "_FILE"] = (secret_dir / name).as_posix()
    envfile = work / "qa.env"
    envfile.write_text("\n".join(key + "='" + value + "'" for key, value in values.items()))
    override = work / "override.json"
    override.write_text(json.dumps({"services": {
        "frontend": {"image": "ambs-containment-frontend:qa", "environment": {"NODE_OPTIONS": "--require=/qa/glob-observer.cjs", "AMBS_GLOB_TRACE": "/tmp/glob-trace.jsonl", "AMBS_GLOB_POSITIVE_CONTROL": "1"}, "volumes": [str(ROOT / "frontend/scripts").replace("\\", "/") + ":/qa:ro"]},
        "backend": {"image": "ambs-containment-backend:qa"},
    }}))
    compose = ["compose", "--env-file", str(envfile), "-p", project, "-f", "compose.production.yaml", "-f", str(override)]
    def run(args, *, data=None, quiet=False):
        result = subprocess.run(["docker", *args], cwd=ROOT, input=data, text=True, capture_output=True)
        if result.returncode:
            # Seed protocol may contain credentials: never include output in exceptions.
            if not quiet:
                (work / "failed-command.log").write_text(result.stdout + result.stderr)
            raise RuntimeError("Docker verification command failed: " + " ".join(args[:2]))
        if not quiet:
            with (work / "verification.log").open("a") as log:
                log.write(result.stdout + result.stderr)
        return result.stdout
    def fixture(action):
        return run(["run", "--rm", "--network", project + "_database", "--mount", "type=bind,source=" + str(secret_dir) + ",target=/run/secrets,readonly", "--mount", "type=bind,source=" + str(ROOT / "backend") + ",target=/app,readonly", "-e", "APP_ENV=test", "-e", "POSTGRES_HOST=db", "-e", "POSTGRES_DB=" + values["PRODUCTION_DB_NAME"], "-e", "POSTGRES_USER=ambs_qa_owner", "ambs-erp-backend:latest", "python", "-m", "tests.containment_fixture", action], quiet=action == "seed")
    def wait(service):
        deadline = time.monotonic() + 150
        while time.monotonic() < deadline:
            ident = run([*compose, "ps", "-q", service]).strip()
            if ident:
                state = json.loads(run(["inspect", ident], quiet=True))[0]["State"]
                if state.get("Health", {}).get("Status") == "healthy":
                    return ident
            time.sleep(2)
        raise RuntimeError(service + " health timeout")
    credentials = None
    try:
        run([*compose, "config", "--quiet"])
        run([*compose, "up", "-d", "--no-build", "db"])
        wait("db")
        fixture("migrate")
        credentials = fixture("seed")
        json.loads(credentials)
        fixture("grant")
        probe = subprocess.run(["docker", "run", "--rm", "--network", project + "_database", "--mount", "type=bind,source=" + str(secret_dir) + ",target=/run/secrets,readonly", "--mount", "type=bind,source=" + str(secret_dir / "database_owner_password") + ",target=/run/secrets/database_password,readonly", "-e", "POSTGRES_HOST=db", "-e", "POSTGRES_DB=" + values["PRODUCTION_DB_NAME"], "-e", "POSTGRES_USER=ambs_qa_owner", "-e", "AUTH_COOKIE_SECURE=true", "-e", "AUTH_ALLOWED_ORIGINS=" + values["PRODUCTION_ALLOWED_ORIGINS"], "ambs-containment-backend:qa"], capture_output=True, text=True)
        assert probe.returncode != 0 and "dedicated non-owner database role" in probe.stderr
        print("PASS production startup rejects database owner credentials", flush=True)
        run([*compose, "up", "-d", "--no-build"])
        backend = wait("backend")
        frontend = wait("frontend")
        gateway = run([*compose, "ps", "-q", "gateway"]).strip()
        # Real candidate runtime: read-only, capabilities dropped, non-root, no direct ports.
        for service, ident in (("frontend", frontend), ("backend", backend), ("db", wait("db"))):
            item = json.loads(run(["inspect", ident], quiet=True))[0]
            assert item["Config"]["User"] not in ("", "root", "0")
            assert not item["HostConfig"]["PortBindings"]
            assert item["HostConfig"]["ReadonlyRootfs"]
            assert "ALL" in item["HostConfig"]["CapDrop"]
        print("PASS runtime non-root, private ports, dropped capabilities, read-only application roots", flush=True)
        run(["exec", frontend, "node", "-e", "Promise.all([['/_next/image?url=/safe.png&w=64&q=75',404],['/__nextjs_original-stack-frames',404],['/_next/webpack-hmr',404],['/api/auth/csrf',426]].map(async([p,s])=>{if((await fetch('http://127.0.0.1:3000'+p)).status!==s)throw Error('closed endpoint check failed')})).catch(()=>process.exit(1))"])
        print("PASS image optimizer returns 404 directly from Next.js, independently of edge filtering", flush=True)
        browser_args = ["run", "--rm", "-i", "--network", "container:" + gateway, "--mount", "type=bind,source=" + str(ROOT / "frontend/scripts") + ",target=/work/tests,readonly", "--mount", "type=bind,source=" + str(work) + ",target=/artifacts", "-e", "AMBS_BROWSER_BASE_URL=https://127.0.0.1:8443", "-e", "AMBS_QA_SELF_SIGNED_TLS=1", "ambs-auth-browser-tools:local"]
        print(run([*browser_args, "/work/tests/verify-containment-browser.mjs"], data=credentials), flush=True)
        print(run([*browser_args, "/work/tests/verify-packing-browser.mjs"], data=credentials), flush=True)
        trace = run(["exec", frontend, "cat", "/tmp/glob-trace.jsonl"])
        assert "trusted-control/**" in trace
        assert "__AMBS_UNTRUSTED_GLOB__" not in trace
        run([*compose, "restart", "backend", "frontend"])
        wait("backend"); wait("frontend")
        print(run([*browser_args, "/work/tests/verify-packing-browser.mjs", "--persistence"], data=credentials), flush=True)
        trace += run(["exec", frontend, "cat", "/tmp/glob-trace.jsonl"])
        assert "__AMBS_UNTRUSTED_GLOB__" not in trace
        (work / "runtime-glob-trace.jsonl").write_text(trace)
        print("PASS bounded HTTP/business-input trace: no marker compiled as glob", flush=True)
        # Keep safe inspect metadata only; never persist Config.Env.
        (work / "result.json").write_text(json.dumps({"passed": True, "project": project, "database": values["PRODUCTION_DB_NAME"], "trace_events": len(trace.splitlines())}, indent=2))
        print("Evidence: " + str(work), flush=True)
    finally:
        credentials = None
        # Compose labels and generated project prefix constrain teardown.
        assert project.startswith("ambs-containment-") and len(suffix) == 32
        run([*compose, "down", "--volumes", "--remove-orphans"])
        # Delete only this run's generated, now unusable QA secrets; no recursion.
        assert secret_dir.resolve().parent == work.resolve() and work.resolve().parent == (ROOT / "artifacts").resolve()
        for name in ("database_owner_password", "database_password", "bff_secret", "ors_api_key", "tls_certificate", "tls_private_key"):
            (secret_dir / name).unlink(missing_ok=True)


if __name__ == "__main__":
    main()
