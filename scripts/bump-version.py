"""Stamp a new version on every asset link in public/index.html and in the app.

    python scripts/bump-version.py

Browsers then always download the latest files after a deploy (no stale app.js),
and the sidebar footer shows the version so anyone can check which build they run.
"""
import datetime, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parents[1]
v = datetime.datetime.now().strftime('%Y.%m.%d-%H%M')
index = ROOT / 'public' / 'index.html'
html = re.sub(r'(/assets/[a-z-]+\.(?:js|css))(\?v=[^"]*)?"', lambda m: f'{m.group(1)}?v={v}"', index.read_text(encoding='utf-8'))
index.write_text(html, encoding='utf-8')
app = ROOT / 'public' / 'assets' / 'app.js'
text = app.read_text(encoding='utf-8')
text, n = re.subn(r"const AMBS_VERSION='[^']*';", f"const AMBS_VERSION='{v}';", text)
if not n:
    raise SystemExit('AMBS_VERSION not found in app.js')
app.write_text(text, encoding='utf-8')
print('version', v)
