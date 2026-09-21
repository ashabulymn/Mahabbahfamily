'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { root,dataDir,mediaDir,collections,init,atomic,validate,fail }=require('./cms-store');
const { page }=require('./render');
const scrypt=promisify(crypto.scrypt);
const MAX_IMAGE=5*1024*1024;
function createServer() {
  const store=init(); const sessions=new Map(); const attempts=new Map(); let loginActive=0;
  const authFile=path.join(dataDir,'auth.json');
  const secure=process.env.CMS_SECURE_COOKIE==='1';
  const cookieName=secure?'__Host-mahabbah':'mahabbah';
  function auth() { try { return JSON.parse(fs.readFileSync(authFile,'utf8')); } catch { return null; } }
  function send(res,status,value) { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(value)); }
  async function body(req,limit=100*1024) {
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')) { const e=new Error('Gunakan application/json.');e.status=415;throw e; }
    if(Number(req.headers['content-length'])>limit) { const e=new Error('Data terlalu besar.');e.status=413;throw e; }
    const chunks=[];let size=0;for await(const chunk of req) {size+=chunk.length;if(size>limit){const e=new Error('Data terlalu besar.');e.status=413;throw e;}chunks.push(chunk);}
    try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));} catch {fail('JSON tidak valid.');}
  }
  function session(req) {
    const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);
    if(!token) return null;const item=sessions.get(token);if(!item)return null;
    if(item.expires<Date.now() || item.absolute<Date.now() || item.revision!==auth()?.revision) {sessions.delete(token);return null;}
    item.expires=Date.now()+30*60*1000;return {token,...item};
  }
  function cookie(res,value,age) {res.setHeader('Set-Cookie',`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`);}
  function raster(buffer) {
    if(buffer.length>8 && buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
    if(buffer.length>3 && buffer[0]===255 && buffer[1]===216 && buffer[2]===255)return 'jpg';
    if(buffer.length>12 && buffer.toString('ascii',0,4)==='RIFF' && buffer.toString('ascii',8,12)==='WEBP')return 'webp';
    fail('Hanya gambar PNG, JPEG, atau WebP. SVG, HTML, dan PDF tidak diterima.');
  }
  function file(req,res,filename,mime,video=false) {
    let stat;try {stat=fs.lstatSync(filename);if(!stat.isFile() || stat.isSymbolicLink()) throw new Error();}catch {res.writeHead(404);res.end('Not found');return;}
    let start=0,end=stat.size-1,status=200;
    const headers={'Content-Type':mime,'Content-Length':stat.size,'Cache-Control':video?'public, max-age=86400':'no-cache'};
    if(video){headers['Accept-Ranges']='bytes';const range=req.headers.range;if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(m&&(m[1]||m[2])){start=m[1]?Number(m[1]):Math.max(0,stat.size-Number(m[2]));end=m[1]&&m[2]?Math.min(Number(m[2]),end):end;}else start=stat.size;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return;}headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;headers['Content-Length']=end-start+1;status=206;}}
    res.writeHead(status,headers);if(req.method==='HEAD'){res.end();return;}const stream=fs.createReadStream(filename,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://images.unsplash.com; media-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self' https://wa.me");
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    try {
      const port=server.address().port;
      const hosts=new Set([`localhost:${port}`,`127.0.0.1:${port}`]);
      const publicOrigin=process.env.CMS_PUBLIC_ORIGIN;
      if(publicOrigin)hosts.add(new URL(publicOrigin).host);
      if(!hosts.has(req.headers.host)){send(res,403,{error:'Host ditolak.'});return;}
      const url=new URL(req.url,'http://localhost');const route=url.pathname;
      const mutation=!['GET','HEAD'].includes(req.method);
      if(mutation){const origins=new Set([`http://localhost:${port}`,`http://127.0.0.1:${port}`]);if(publicOrigin)origins.add(publicOrigin);if(!origins.has(req.headers.origin) || req.headers['sec-fetch-site']==='cross-site'){send(res,403,{error:'Origin ditolak.'});return;}}
      if(route.startsWith('/api/')) {
        res.setHeader('Cache-Control','no-store');
        if(route==='/api/session' && req.method==='GET'){const s=session(req);send(res,200,{authenticated:!!s,configured:!!auth(),csrf:s?.csrf});return;}
        if(route==='/api/login' && req.method==='POST') {
          const credentials=auth();if(!credentials){send(res,503,{error:'Admin belum disiapkan. Jalankan node scripts\\setup-admin.js di terminal lokal.'});return;}
          const key=req.socket.remoteAddress;const now=Date.now();let limit=attempts.get(key);if(!limit || limit.until<now){limit={count:0,until:now+15*60*1000};attempts.set(key,limit);}if(limit.count>=8 || loginActive>=2){res.setHeader('Retry-After','900');send(res,429,{error:'Terlalu banyak percobaan. Coba lagi dalam 15 menit.'});return;}
          limit.count++;const input=await body(req,2048);const password=input?.password;if(typeof password!=='string'||password.length>128 || !password){send(res,401,{error:'Password tidak sesuai.'});return;}
          loginActive++;let computed;try{computed=await scrypt(password,credentials.salt,64);}finally{loginActive--;}
          if(!crypto.timingSafeEqual(computed,Buffer.from(credentials.hash,'hex'))){send(res,401,{error:'Password tidak sesuai.'});return;}
          const old=session(req);if(old)sessions.delete(old.token);
          for(const [key,value] of sessions)if(value.expires<now||value.absolute<now)sessions.delete(key);
          if(sessions.size>=100)sessions.delete(sessions.keys().next().value);
          const token=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(32).toString('hex');sessions.set(token,{csrf,revision:credentials.revision,expires:now+30*60*1000,absolute:now+8*60*60*1000});cookie(res,token,8*60*60);send(res,200,{csrf});return;
        }
        const s=session(req);if(!s){send(res,401,{error:'Silakan login kembali.'});return;}
        if(mutation && req.headers['x-csrf-token']!==s.csrf){send(res,403,{error:'Token keamanan tidak valid. Muat ulang halaman.'});return;}
        if(route==='/api/logout' && req.method==='POST'){sessions.delete(s.token);cookie(res,'',0);send(res,200,{ok:true});return;}
        if(route==='/api/content' && req.method==='GET'){send(res,200,store.state);return;}
        if(route==='/api/media' && req.method==='GET'){send(res,200,fs.readdirSync(mediaDir).filter(n=>/^[a-zA-Z0-9-]+\.(png|jpg|jpeg|webp)$/.test(n)&&fs.lstatSync(path.join(mediaDir,n)).isFile()&&!fs.lstatSync(path.join(mediaDir,n)).isSymbolicLink()).map(n=>({url:`/media/${n}`})));return;}
        if(route==='/api/media' && req.method==='POST'){
          const input=await body(req,Math.ceil(MAX_IMAGE*4/3)+2048);if(typeof input?.data!=='string'||!input.data || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.data))fail('Gambar base64 tidak valid.');const bytes=Buffer.from(input.data,'base64');if(bytes.length>MAX_IMAGE){send(res,413,{error:'Gambar maksimal 5 MB.'});return;}const ext=raster(bytes);const name=`upload-${crypto.randomUUID()}.${ext}`;fs.writeFileSync(path.join(mediaDir,name),bytes,{flag:'wx',mode:0o600});send(res,201,{url:`/media/${name}`});return;
        }
        const mediaMatch=/^\/api\/media\/([a-zA-Z0-9-]+\.(?:png|jpg|jpeg|webp))$/.exec(route);
        if(mediaMatch&&req.method==='DELETE'){const url=`/media/${mediaMatch[1]}`;if(collections.some(k=>store.state[k].some(r=>r.image===url||r.brochure===url))){send(res,409,{error:'Gambar masih digunakan konten (termasuk draf).'});return;}const target=path.join(mediaDir,mediaMatch[1]);if(!fs.existsSync(target)){send(res,404,{error:'Gambar tidak ditemukan.'});return;}fs.unlinkSync(target);send(res,200,{ok:true});return;}
        const m=/^\/api\/content\/(packages|teams|testimonials|posts|gallery)(?:\/([a-zA-Z0-9-]+))?$/.exec(route);
        if(m){const [,type,id]=m; if(req.method==='POST'&&!id){const input=await body(req);const record=validate(type,input);const next=structuredClone(store.state);next[type].push(record);store.save(next);send(res,201,record);return;}
          if(id&&['PUT','DELETE'].includes(req.method)){const input=req.method==='PUT'?await body(req):null;const index=store.state[type].findIndex(r=>r.id===id);if(index<0){send(res,404,{error:'Konten tidak ditemukan.'});return;}const next=structuredClone(store.state);let record;if(req.method==='PUT'){record=validate(type,input,next[type][index]);next[type][index]=record;}else next[type].splice(index,1);store.save(next);send(res,200,record||{ok:true});return;}}
        send(res,404,{error:'Endpoint tidak ditemukan.'});return;
      }
      if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');send(res,405,{error:'Metode tidak diizinkan.'});return;}
      const staticFiles={'/brand.css':['brand.css','text/css'],'/brand-logo.png':['brand-logo.png','image/png'],'/styles.css':['styles.css','text/css'],'/editorial.css':['editorial.css','text/css'],'/content.css':['content.css','text/css'],'/app.js':['app.js','text/javascript'],'/admin.js':['admin.js','text/javascript'],'/admin.css':['admin.css','text/css'],'/admin':['admin.html','text/html'],'/admin/':['admin.html','text/html']};
      if(staticFiles[route]){const [name,mime]=staticFiles[route];file(req,res,path.join(root,name),`${mime}; charset=utf-8`);return;}
      if(route==='/bg1-web.mp4'){file(req,res,path.join(root,'bg1-web.mp4'),'video/mp4',true);return;}
      if(/^\/media\/[a-zA-Z0-9-]+\.(png|jpg|jpeg|webp)$/.test(route)){const ext=path.extname(route);file(req,res,path.join(mediaDir,path.basename(route)),({'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'})[ext]);return;}
      const html=page(route,store.state);res.writeHead(html?200:404,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(req.method==='HEAD'?'':html||'<!doctype html><html lang="id"><meta charset="utf-8"><title>Tidak ditemukan</title><h1>Halaman tidak ditemukan.</h1><a href="/">Kembali ke beranda</a></html>');
    }catch(error){if(!res.headersSent)send(res,error.status||500,{error:error.status?error.message:'Terjadi kesalahan. Periksa penyimpanan server.'});else res.destroy();}
  });
  server.requestTimeout=30_000;server.headersTimeout=15_000;server.maxRequestsPerSocket=100;
  return server;
}
module.exports={createServer};
