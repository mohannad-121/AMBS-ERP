"""Redacted source/staged Git audit. Actual .env secrets stay in memory only."""
import argparse,base64,hashlib,json,re,subprocess,shutil
from pathlib import Path
from urllib.parse import quote

ROOT=Path(__file__).resolve().parents[1]


def git(*args):return subprocess.check_output(['git','-C',str(ROOT),*args])


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--staged',action='store_true');parser.add_argument('--export');parser.add_argument('--report',required=True);args=parser.parse_args()
    secrets=[]
    for line in (ROOT/'.env').read_text(encoding='utf-8-sig').splitlines():
        if '=' not in line or line.lstrip().startswith('#'):continue
        name,value=line.split('=',1);value=value.strip().strip('\"\'')
        if re.search(r'PASSWORD|SECRET|TOKEN|KEY',name,re.I) and len(value)>=8 and not value.startswith('replace_'):
            secrets.append(value)
    needles=set()
    for value in secrets:
        needles.update([value.encode(),quote(value,safe='').encode(),base64.b64encode(value.encode()),value.encode('utf-16-le')])
    files=git('diff','--cached','--name-only','--diff-filter=ACM','-z') if args.staged else git('ls-files','--cached','--others','--exclude-standard','-z')
    files=sorted(set(p for p in files.decode().split('\0') if p))
    findings=[];inventory=[]
    patterns={
      'private-key':re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----'),
      'github-token':re.compile(rb'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})'),
      'aws-access-key':re.compile(rb'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'),
      'credential-url':re.compile(rb'(?:postgres(?:ql)?(?:\+psycopg)?|mysql|mongodb(?:\+srv)?):\/\/[^\s/:]+:[^\s@${}]+@'),
      'jwt-literal':re.compile(rb'\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b')}
    export=Path(args.export) if args.export else None
    if export:
        if export.exists():raise RuntimeError('Refusing to overwrite an audit export')
        export.mkdir(parents=True)
    forbidden={'.dump','.backup','.bak','.pem','.key','.p12','.pfx','.age','.enc','.sqlite','.sqlite3','.db','.csv','.xlsx','.xls','.log','.zip','.gz','.tar','.png','.jpg','.jpeg','.pdf','.docx','.exe','.dll'}
    for relative in files:
        path=ROOT/relative
        data=git('show',':'+relative) if args.staged else path.read_bytes()
        checks=[]
        if path.name.startswith('.env') and path.name!='.env.example':checks.append('private-env-path')
        if path.suffix.lower() in forbidden or any(p in {'node_modules','.next','__pycache__','backups','artifacts','storage','uploads','logs','traces'} for p in Path(relative).parts):checks.append('private-or-generated-path')
        if len(data)>2_000_000:checks.append('unexpected-large-file')
        if b'\x00' in data:checks.append('unexpected-binary')
        if any(needle in data for needle in needles):checks.append('configured-secret-match')
        for rule,pattern in patterns.items():
            if pattern.search(data):checks.append(rule)
        for rule in checks:findings.append({'path':relative,'rule':rule})
        inventory.append({'path':relative,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
        if export:
            target=export/relative;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    # Scan every stored Git object, including unreachable objects. No content is printed.
    objects=git('cat-file','--batch-all-objects','--batch-check=%(objectname) %(objecttype)').decode().splitlines()
    for entry in objects:
        sha,kind=entry.split()
        if kind not in {'blob','commit','tag'}:continue
        data=git('cat-file',kind,sha)
        if any(n in data for n in needles):findings.append({'object':sha,'rule':'configured-secret-in-history'})
        for rule,pattern in patterns.items():
            if pattern.search(data):findings.append({'object':sha,'rule':rule+'-in-history'})
    report={'status':'PASS' if not findings else 'REVIEW_REQUIRED','scope':'staged' if args.staged else 'tracked and untracked candidates',
        'files':len(files),'bytes':sum(f['bytes'] for f in inventory),'git_objects':len(objects),'configured_secret_variants_checked':len(needles),
        'findings':findings,'inventory':inventory}
    Path(args.report).write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='inventory'}))
    if findings:raise SystemExit(1)


if __name__=='__main__':main()
