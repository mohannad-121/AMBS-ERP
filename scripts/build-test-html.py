"""Build one self-contained HTML file of AMBS for testers.

    python scripts/build-test-html.py [output.html]

The file opens by double-click (no server, no login, no Supabase). Everything is
saved in the browser that opens it. It starts empty with the two AMBS stores, like
the employee test workspace. Rebuild it after every round of edits.
"""
import json, pathlib, re, sys, datetime

ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public' / 'assets'
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / 'AMBS_Test.html'
SCRIPTS = ['config.js', 'jspdf.js', 'catalog.js', 'app.js', 'lightbox.js', 'assistant.js', 'page-theme.js']

def read(name):
    return (ASSETS / name).read_text(encoding='utf-8')

def patch(text, old, new, name):
    if text.count(old) != 1:
        raise SystemExit(f'build-test-html: could not patch {name}: {old[:70]!r}')
    return text.replace(old, new)

STORES = [
    {'id': 'test-main-store', 'name': 'Main Store · DIP', 'city': 'Dubai', 'address': 'Plot 598-123, Dubai Investment Park 1',
     'url': 'https://www.google.com/maps/search/?api=1&query=25.0025,55.1580', 'notes': '', 'lat': 25.0025, 'lng': 55.158, 'stock': True, 'active': True},
    {'id': 'test-dubai-hills', 'name': 'Dubai Hills Site Store', 'city': 'Dubai', 'address': 'Dubai Hills Estate, Plot 12',
     'url': '', 'notes': '', 'lat': None, 'lng': None, 'stock': True, 'active': True},
]

js = {name: read(name) for name in SCRIPTS}
app = js['app.js']
# browser-only workspace, its own database name, no Supabase
app = patch(app, "demo: ['localhost', '127.0.0.1'].includes(location.hostname),", 'demo: true,', 'demo mode')
app = patch(app, """indexedDB.open(['localhost','127.0.0.1'].includes(location.hostname)
        ? 'ambs-erp-local-demo' : 'ambs-erp-browser-workspace', 1)""", "indexedDB.open('ambs-erp-test-copy', 1)", 'database name')
# first start: the two stores, no built-in catalogue parts
app = patch(app, """      const data=emptyStateData();
      addWorkbookParts(data);""", """      const data=emptyStateData();
      addWorkbookParts(data);
      data.deletedWorkbookParts=data.parts.map(p=>p.id);data.parts=[];
      data.locations=""" + json.dumps(STORES, ensure_ascii=False) + """;""", 'first-start seed')
app = patch(app, """<div class="o-side-foot">${esc(SET.company)}</div>""",
            """<div class="o-side-foot">${esc(SET.company)}<br><b style="color:#9b1c1c">Test copy</b></div>""", 'sidebar label')
js['app.js'] = app
js['assistant.js'] = patch(js['assistant.js'], "const text=await (await fetch(GUIDE_URL,{cache:'no-store'})).text();",
                           "const text=document.getElementById('ambs-guide').textContent;", 'assistant guide')

guide = read('assistant-guide.md')
for name, text in [*js.items(), ('assistant-guide.md', guide)]:
    if re.search(r'</script', text, re.I):
        raise SystemExit(f'build-test-html: {name} contains </script')

index = (ROOT / 'public' / 'index.html').read_text(encoding='utf-8')
head = index.split('<link rel="stylesheet" href="/assets/app.css">')[0]
body = index[index.index('<body>') + 6:index.index('</body>')]
stamp = datetime.datetime.now().strftime('%d %b %Y %H:%M')
banner = f"""<div class="test-ribbon">TEST COPY · built {stamp} · data is saved only in this browser ·
  send your data with Settings &amp; Data → Export Backup</div>"""
html = (head.replace('<title>AMBS Production System</title>', '<title>AMBS – Test copy</title>') +
        '<style>\n' + read('app.css') + """
.test-ribbon{position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:80;padding:4px 14px;border-radius:6px 6px 0 0;
  background:#9b1c1c;color:#fff;font:600 11.5px/1.5 Inter,Segoe UI,Arial,sans-serif;white-space:nowrap;opacity:.92;pointer-events:none}
@media (max-width:720px){.test-ribbon{white-space:normal;width:92%;text-align:center}}
@media print{.test-ribbon{display:none}}
</style>
</head><body>""" + body + banner +
        '\n<script type="text/markdown" id="ambs-guide">' + guide + '</script>\n' +
        ''.join(f'<script>/* {n} */\n{js[n]}\n</script>\n' for n in SCRIPTS) +
        '</body></html>\n')
OUT.write_text(html, encoding='utf-8')
print(f'{OUT}  ({OUT.stat().st_size / 1024 / 1024:.1f} MB)')
