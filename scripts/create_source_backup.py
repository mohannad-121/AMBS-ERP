"""Create and fully verify a reproducible source ZIP outside the working repository."""
import argparse, hashlib, json, subprocess, zipfile
from pathlib import Path


def main():
    parser=argparse.ArgumentParser();parser.add_argument('destination');args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]
    destination=Path(args.destination).resolve()
    if destination==root or root in destination.parents:
        raise RuntimeError('Backup destination must be outside the repository')
    target=destination/'application-source.zip'
    if target.exists():raise RuntimeError('Refusing to overwrite a source backup')
    files=subprocess.check_output(['git','-C',str(root),'ls-files','--cached','--others','--exclude-standard','-z']).decode().split('\0')
    files=sorted(set(f for f in files if f))
    inventory=[]
    with zipfile.ZipFile(target,'x',zipfile.ZIP_DEFLATED) as archive:
        for relative in files:
            path=(root/relative).resolve()
            if root not in path.parents or not path.is_file() or path.is_symlink():
                raise RuntimeError('Invalid source backup member')
            if path.name.startswith('.env') and path.name!='.env.example':
                raise RuntimeError('Private configuration must use encrypted backup')
            data=path.read_bytes()
            archive.write(path,relative)
            inventory.append({'path':relative,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    with zipfile.ZipFile(target) as archive:
        if archive.testzip() is not None:raise RuntimeError('Source archive integrity failure')
        for entry in inventory:
            if hashlib.sha256(archive.read(entry['path'])).hexdigest()!=entry['sha256']:
                raise RuntimeError('Source member hash mismatch')
        required=['compose.yaml','backend/requirements.lock','frontend/package-lock.json','frontend/scripts/patch-next-router.mjs','backend/alembic/versions/0008_delivery_routes_delivery_routes.py']
        if not all(p in archive.namelist() for p in required):raise RuntimeError('Required reproducibility component missing')
    (destination/'source-inventory.json').write_text(json.dumps(inventory,indent=2),encoding='utf-8')
    print(f'PASS source archive: {len(inventory)} files; CRC and every member SHA256 verified')


if __name__=='__main__':main()
