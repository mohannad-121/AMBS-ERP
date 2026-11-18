# Phase 7 final security review

## Verdict and approval boundary

Follow-up: [PHASE_7_SECURITY_CONTAINMENT_REPORT.md](PHASE_7_SECURITY_CONTAINMENT_REPORT.md) records the subsequent image-optimizer closure, actual standalone artifact inspection and isolated production Docker verification. The configuration/default-path observations below describe the earlier review state; the OPEN advisory and owner-approval boundary remain in force.

**SECURITY CONDITIONALLY ACCEPTABLE PENDING OWNER APPROVAL.** This is a proposed, limited risk disposition for review, not risk acceptance. **SECURITY REMEDIATED: NO.** GHSA-fc5q-39xc-vjpf / CVE-2026-112366 remains an OPEN security exception. No owner approval has been inferred, no audit result suppressed, and no automatic fix/major tooling downgrade or private library patch applied. Publishing the private review PR does not authorize merge or deployment.

## Current official status

On 2026-11-17 the reviewed [GitHub advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) identifies picomatch through 4.0.7 as affected and lists no patched version. The [official npm registry](https://registry.npmjs.org/picomatch/latest) still identifies 4.0.7 as latest. The referenced upstream [PR 194](https://github.com/micromatch/picomatch/pull/194) is open; it is not an official patched release or evidence that this installed tree is remediated. Fresh metadata and the installed/lockfile graph are retained in private release evidence. Existing Next 16.4.6, React/ReactDOM 19.3.1 and router compatibility protections remain unchanged.

The issue is excessive regular-expression backtracking when dangerous repeated extglob patterns are compiled and matched. The important trust boundary is who controls the glob pattern, together with the matched input. Local lint/build availability can be affected by untrusted project/configuration patterns; a clean production dependency audit alone cannot establish safety of vendored framework code.

## Installed dependencies and all paths

The installed npm tree resolves picomatch 2.3.2 through the Next ESLint plugin/fast-glob/micromatch, and picomatch 4.0.7 through TypeScript ESLint/typescript-estree/tinyglobby, including fdir's installed peer. Both standalone package-lock entries are marked development-only. npm's deduplicated display reports three representative paths; traversing dependencies, optional dependencies and installed peers without cycles gives these 15 full paths:

1. `@next/eslint-plugin-next@16.4.6 -> fast-glob@3.3.1 -> micromatch@4.0.8 -> picomatch@2.3.2`
2. `typescript-eslint@8.72.2 -> @typescript-eslint/eslint-plugin@8.72.2 -> @typescript-eslint/parser@8.72.2 -> @typescript-eslint/typescript-estree@8.72.2 -> tinyglobby@0.2.17 -> fdir@6.5.0 -> picomatch@4.0.7`
3. `typescript-eslint@8.72.2 -> @typescript-eslint/eslint-plugin@8.72.2 -> @typescript-eslint/parser@8.72.2 -> @typescript-eslint/typescript-estree@8.72.2 -> tinyglobby@0.2.17 -> picomatch@4.0.7`
4. `typescript-eslint@8.72.2 -> @typescript-eslint/eslint-plugin@8.72.2 -> @typescript-eslint/type-utils@8.72.2 -> @typescript-eslint/typescript-estree@8.72.2 -> tinyglobby@0.2.17 -> fdir@6.5.0 -> picomatch@4.0.7`
5. `typescript-eslint@8.72.2 -> @typescript-eslint/eslint-plugin@8.72.2 -> @typescript-eslint/type-utils@8.72.2 -> @typescript-eslint/typescript-estree@8.72.2 -> tinyglobby@0.2.17 -> picomatch@4.0.7`
6. `typescript-eslint@8.72.2 -> @typescript-eslint/eslint-plugin@8.72.2 -> @typescript-eslint/type-utils@8.72.2 -> @typescript-eslint/utils@8.72.2 -> @typescript-eslint/typescript-estree@8.72.2 -> tinyglobby@0.2.17 -> fdir@6.5.0 -> picomatch@4.0.7`
7. `typescript-eslint@8.72.2 -> @typescript-eslint/eslint-plugin@8.72.2 -> @typescript-eslint/type-utils@8.72.2 -> @typescript-eslint/utils@8.72.2 -> @typescript-eslint/typescript-estree@8.72.2 -> tinyglobby@0.2.17 -> picomatch@4.0.7`
8. `typescript-eslint@8.72.2 -> @typescript-eslint/eslint-plugin@8.72.2 -> @typescript-eslint/utils@8.72.2 -> @typescript-eslint/typescript-estree@8.72.2 -> tinyglobby@0.2.17 -> fdir@6.5.0 -> picomatch@4.0.7`
9. `typescript-eslint@8.72.2 -> @typescript-eslint/eslint-plugin@8.72.2 -> @typescript-eslint/utils@8.72.2 -> @typescript-eslint/typescript-estree@8.72.2 -> tinyglobby@0.2.17 -> picomatch@4.0.7`
10. `typescript-eslint@8.72.2 -> @typescript-eslint/parser@8.72.2 -> @typescript-eslint/typescript-estree@8.72.2 -> tinyglobby@0.2.17 -> fdir@6.5.0 -> picomatch@4.0.7`
11. `typescript-eslint@8.72.2 -> @typescript-eslint/parser@8.72.2 -> @typescript-eslint/typescript-estree@8.72.2 -> tinyglobby@0.2.17 -> picomatch@4.0.7`
12. `typescript-eslint@8.72.2 -> @typescript-eslint/typescript-estree@8.72.2 -> tinyglobby@0.2.17 -> fdir@6.5.0 -> picomatch@4.0.7`
13. `typescript-eslint@8.72.2 -> @typescript-eslint/typescript-estree@8.72.2 -> tinyglobby@0.2.17 -> picomatch@4.0.7`
14. `typescript-eslint@8.72.2 -> @typescript-eslint/utils@8.72.2 -> @typescript-eslint/typescript-estree@8.72.2 -> tinyglobby@0.2.17 -> fdir@6.5.0 -> picomatch@4.0.7`
15. `typescript-eslint@8.72.2 -> @typescript-eslint/utils@8.72.2 -> @typescript-eslint/typescript-estree@8.72.2 -> tinyglobby@0.2.17 -> picomatch@4.0.7`

These are lint/type-analysis dependencies rather than application imports. The 12 HIGH npm findings include dependent-package meta-vulnerabilities and are not 12 independent underlying advisories. The suggested automatic remedies include out-of-range changes such as Next ESLint 16.4.6 to 14.2.35 (a major downgrade) and TypeScript ESLint 8.72.2 to 8.47.0. These are not a compatible reviewed security fix and were not performed.

## Vendored Next.js code: runtime caveat

A separate unversioned `next/dist/compiled/picomatch` copy is shipped inside the runtime Next package. It is not represented as a standalone dependency in npm's runtime audit, so the earlier description of all exposure as development-only was incomplete. No exact picomatch version or fixed status is asserted for this vendor bundle. Its inspected SHA-256 is `607dc79784c1161c33076903769dba23e63d9d9ccfe3c4695a32ebe3a5ab892d`.

Inspected Next references (CommonJS and corresponding ESM):

- build/collect-build-traces.js and build/index.js: developer/build configuration and file tracing patterns.
- build/segment-config/middleware/middleware-config.js: developer-supplied middleware glob validation.
- build/webpack/plugins/middleware-plugin.js and next-trace-entrypoints-plugin.js: build-time matching.
- shared/lib/match-local-pattern.js and match-remote-pattern.js: potential server image-optimizer allowlist matching.

The runtime image matchers compile `pattern.pathname` / `pattern.hostname` from trusted configuration and test the incoming URL; the URL is not compiled as a glob. Current next.config.ts does not provide localPatterns/remotePatterns, tracing globs or dynamic middleware globs. Next defaults have undefined localPatterns and empty remotePatterns/domains. Instrumentation in a separate short-lived Node process confirmed that crafted URL text causes zero glob compilations with these defaults; with an explicit trusted local pattern, only `/**` was compiled. This is reachability evidence, not an exploit proof or a patch. The Next image optimizer is not used by AMBS protected item pictures, which use authenticated raw image endpoints.

## Application input tracing and actual exposure

Review covered the exact current worktree and Phase 7 diff; every existing source byte initially matched the prior frozen 222-file Phase 7 inventory. There are no direct picomatch/micromatch/tinyglobby/fast-glob imports or dynamic glob APIs in application/API/business code. BFF routing uses fixed regular-expression allowlists. BOM/planning uses Decimal quantities, existing identities and parameterized SQL. PDF rendering uses escaped text and protected UUID-based image keys, with no template evaluation or remote resources. Customer/item descriptions, search text, uploaded pictures and document request bodies are not passed into glob-pattern compilation. Private uploads are in the backend image volume, outside frontend source scanning.

Checked developer configuration uses literal patterns: ESLint's `.next/**`, `next-env.d.ts`, `**/*.tsx`; TypeScript's `**/*.ts`, `**/*.tsx` and generated Next type directories. No untrusted business-user path to the vulnerable pattern argument was found. A remote denial of service through this advisory has not been demonstrated for the current configuration. The vendor/runtime caveat prevents claiming that production audit zero means the vulnerable family of code is absent.

## Applicable mitigation and residual risk

1. Keep source/configuration/glob inputs trusted; review all future pattern changes. Do not turn user searches, filenames, engineering references or uploads into glob patterns.
2. Keep dev/build services bound to localhost/private networks; do not expose the Next development server publicly. Build untrusted contributions only in isolated, bounded runners without production secrets; apply job time/memory limits in any future CI.
3. Do not configure dynamic image allowlist or tracing/middleware patterns from requests, database fields or unreviewed environment values. Any image-pattern change requires rechecking server-side matching reachability.
4. Retain the full audit evidence and this OPEN exception prominently in the PR. The owner/security reviewer must approve or reject the scoped risk before merge/production acceptance; this agent grants neither.
5. Monitor the official picomatch advisory/releases and Next's vendored dependency updates. When a legitimate compatible fix exists, apply the narrowest verified update, rerun all audits, compatibility tests, production build and browser tests, then close the exception only with evidence.

Residual risk is build/developer availability from malicious pattern/configuration inputs, plus a conservatively tracked framework vendor dependency in potential runtime image matching. Current application input routing reduces exploitability but does not remove the upstream defect. Production deployment has additional prerequisites in SECURITY.md and remains outside this release operation.

## Review and verification evidence

The release directory under ignored artifacts/phase7-release contains the installed dependency tree, all 15 lockfile/peer paths, official metadata, vendored code hash/reference inventory and isolated runtime pattern traces. Fresh runtime/full npm and locked Python audits, the uninterrupted backend suite, frontend checks and both browser modes are recorded in PHASE_7_RELEASE_REPORT.md once the release gates finish. A clean runtime/Python audit must be distinguished from the unresolved full npm result.
