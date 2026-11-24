import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDir = fileURLToPath(new URL('./public/', import.meta.url));
const root = resolve(publicDir);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.md':'text/markdown; charset=utf-8' };

createServer(async (req, res) => {
  if (!['GET','HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow:'GET, HEAD' }).end();
    return;
  }
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (path === '/') path='/index.html';
    const file=resolve(root,'.'+path), type=types[extname(file)];
    if (!file.startsWith(root+sep)||!type||!(await stat(file)).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200,{ 'Content-Type':type, 'X-Content-Type-Options':'nosniff', 'Cache-Control':'no-store' });
    if(req.method==='HEAD')res.end();
    else createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  } catch { res.writeHead(404).end(); }
}).listen(Number(process.env.PORT||4173),'127.0.0.1',function(){
  console.log('AMBS is available at http://127.0.0.1:'+this.address().port);
});
