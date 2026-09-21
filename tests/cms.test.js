'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const project=path.resolve(__dirname,'..');
const directory=path.join(project,`.test-state-${crypto.randomUUID()}`);
process.env.CMS_DATA_DIR=directory;
const {createServer}=require('../cms-server');
const {availability}=require('../render');
let server,base,cookie='',csrf='';
async function start(){server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;}
async function stop(){await new Promise(resolve=>server.close(resolve));}
async function request(route,method='GET',data,extra={}){const r=await fetch(base+route,{method,headers:{Origin:base,...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(data?{'Content-Type':'application/json'}:{}),...extra},body:data?JSON.stringify(data):undefined});const text=await r.text();let value;try{value=JSON.parse(text);}catch{value=text;}return {status:r.status,headers:r.headers,value};}
const imageBytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM5kAAAAASUVORK5CYII=','base64');
test('Persistent CMS, authentication, routes, media and public rendering',async t=>{
  fs.mkdirSync(path.join(directory,'media'),{recursive:true});for(const name of fs.readdirSync(path.join(project,'media')).filter(n=>n.startsWith('legacy-')))fs.copyFileSync(path.join(project,'media',name),path.join(directory,'media',name));
  try{
    await start();
    await t.test('locked until local setup; drafts and source files never public',async()=>{
      assert.deepEqual((await request('/api/session')).value,{authenticated:false,configured:false});
      assert.equal((await request('/api/login','POST',{password:'not-configured'})).status,503);
      for(const url of ['/api/content','/api/media'])assert.equal((await request(url)).status,401);
      for(const url of ['/Lampiran/mahr5644_mahabbah.sql','/Lampiran/public_html.zip','/data/content.json','/data/auth.json','/data/seed.json','/scripts/legacy-parser.js','/server.js','/Bg1.mp4','/media/%2e%2e%2fdata%2fauth.json','/blog/artikel-2'])assert.equal((await request(url)).status,404,url);
      const home=await request('/');assert.equal(home.status,200);assert.match(home.value,/UMROH REGULER/);assert.match(home.value,/bg1-web.mp4/);assert.match(home.value,/Dina Hidayati/);assert.doesNotMatch(home.value,/<!-- CMS:/);assert.match(home.headers.get('content-security-policy'),/object-src 'none'/);
      for(const url of ['/blog','/galeri','/paket/paket-1','/blog/artikel-10002','/admin'])assert.equal((await request(url)).status,200,url);
      assert.match((await request('/paket/paket-1')).value,/wajib konfirmasi/);
      const logo=await fetch(base+'/brand-logo.png');assert.equal(logo.status,200);assert.match(logo.headers.get('content-type'),/^image\/png/);
      assert.equal(crypto.createHash('sha256').update(Buffer.from(await logo.arrayBuffer())).digest('hex'),'9512b05a7b9c1cd8a937251bc2dab8f9a5eb6649fb64d63087677abac7e82d21');
      assert.equal((await request('/brand.css')).status,200);
      assert.match(home.headers.get('content-security-policy'),/frame-src 'none'/);
      assert.equal((await request('/audio.mp3')).status,404);
      const v=await fetch(base+'/bg1-web.mp4',{headers:{Range:'bytes=0-1023'}});assert.equal(v.status,206);assert.equal((await v.arrayBuffer()).byteLength,1024);
      assert.equal((await fetch(base+'/bg1-web.mp4',{headers:{Range:'bytes=999999999-'}})).status,416);
      assert.equal((await fetch(base+'/bg1-web.mp4',{method:'HEAD'})).status,200);
    });
    const password=crypto.randomBytes(28).toString('base64url');
    await t.test('local setup stores a salted hash, never a plaintext password',()=>{
      const result=spawnSync(process.execPath,['scripts\\setup-admin.js'],{cwd:project,env:{...process.env,CMS_ADMIN_PASSWORD:password},encoding:'utf8'});assert.equal(result.status,0,result.stderr);const raw=fs.readFileSync(path.join(directory,'auth.json'),'utf8');assert.ok(!raw.includes(password));assert.ok(JSON.parse(raw).hash.length===128);
    });
    await t.test('authentication, origin, csrf, cookies and input checks',async()=>{
      assert.equal((await request('/api/login','POST',{password}, {Origin:'https://untrusted.invalid'})).status,403);
      assert.equal((await request('/api/login','POST',{password:'wrong'})).status,401);
      const login=await request('/api/login','POST',{password});assert.equal(login.status,200);csrf=login.value.csrf;cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly/);assert.match(login.headers.get('set-cookie'),/SameSite=Strict/);
      assert.equal((await request('/api/content/teams','POST',{name:'x'},{'X-CSRF-Token':''})).status,403);
      assert.equal((await request('/api/content/teams','POST',{name:'x',position:'x',image:'javascript:alert(1)'})).status,400);
      assert.equal((await request('/api/content/teams','POST',{name:'x',unknown:true})).status,400);
      assert.equal((await request('/api/content/teams','POST',{name:'x',published:'true'})).status,400);
      assert.equal((await request('/api/content/packages','POST',{name:'x',title:'x',category:'umroh',status:'available',validUntil:'2020-01-01'})).status,400);
      assert.equal((await request('/api/content/posts','POST',{title:'x',content:'x',date:'2026-02-30'})).status,400);
      const malformed=await fetch(base+'/api/content/teams',{method:'POST',headers:{Origin:base,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:'{'});assert.equal(malformed.status,400);
      assert.equal(availability({status:'available',validUntil:'2020-01-01'}),'Arsip program · wajib konfirmasi ketersediaan');
    });
    let upload,records={};
    await t.test('raster upload and rejected active content',async()=>{
      assert.equal((await request('/api/media','POST',{data:Buffer.from('<svg onload="alert(1)"></svg>').toString('base64')})).status,400);
      const r=await request('/api/media','POST',{data:imageBytes.toString('base64')});assert.equal(r.status,201);upload=r.value.url;assert.equal((await request(upload)).status,200);
      assert.ok((await request('/api/media')).value.some(m=>m.url===upload));
    });
    await t.test('create and update all five collections with escaped public output',async()=>{
      const samples={packages:{name:'Paket uji',title:'Program uji',summary:'Ringkas',content:'Rincian',category:'umroh',status:'confirmation',price:'Referensi'},teams:{name:'<script>alert(1)</script>',position:'Uji'},testimonials:{name:'Jamaah uji',content:'Pengalaman uji',rating:4},posts:{title:'Artikel uji',content:'<img src=x onerror=alert(1)>',date:'2026-09-20'},gallery:{title:'Galeri uji',caption:'Catatan'}};
      for(const [type,sample]of Object.entries(samples)){
        const r=await request(`/api/content/${type}`,'POST',{...sample,image:upload,published:true,order:1});assert.equal(r.status,201,JSON.stringify(r.value));records[type]=r.value;
        const updated=await request(`/api/content/${type}/${r.value.id}`,'PUT',{...r.value,sourceNote:'Persisted verification note'});assert.equal(updated.status,200);records[type]=updated.value;
      }
      const home=(await request('/')).value;assert.match(home,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);assert.ok(!home.includes('<script>alert(1)</script>'));
      const article=(await request(`/blog/${records.posts.id}`)).value;assert.match(article,/&lt;img src=x onerror=alert\(1\)&gt;/);
      assert.equal((await request('/api/media/'+upload.split('/').pop(),'DELETE')).status,409);
    });
    await t.test('disk persistence survives server restart; sessions do not',async()=>{
      await stop();await start();assert.equal((await request('/api/content')).status,401);cookie='';csrf='';const login=await request('/api/login','POST',{password});cookie=login.headers.get('set-cookie').split(';')[0];csrf=login.value.csrf;
      const content=(await request('/api/content')).value;for(const [type,record]of Object.entries(records)){assert.equal(content[type].find(r=>r.id===record.id).sourceNote,'Persisted verification note');}assert.equal((await request(upload)).status,200);
    });
    await t.test('unpublish, delete all collections, and delete unused media',async()=>{
      const draft=await request(`/api/content/posts/${records.posts.id}`,'PUT',{...records.posts,published:false});assert.equal(draft.status,200);assert.equal((await request(`/blog/${records.posts.id}`)).status,404);
      for(const [type,record]of Object.entries(records)){assert.equal((await request(`/api/content/${type}/${record.id}`,'DELETE')).status,200);assert.ok(!(await request('/api/content')).value[type].some(r=>r.id===record.id));}
      assert.equal((await request('/api/media/'+upload.split('/').pop(),'DELETE')).status,200);assert.equal((await request(upload)).status,404);
      await stop();await start();cookie='';csrf='';const login=await request('/api/login','POST',{password});cookie=login.headers.get('set-cookie').split(';')[0];csrf=login.value.csrf;const content=(await request('/api/content')).value;for(const [type,record]of Object.entries(records))assert.ok(!content[type].some(r=>r.id===record.id));
    });
    await t.test('logout and password reset revoke sessions; repeated failures throttled',async()=>{
      assert.equal((await request('/api/logout','POST')).status,200);assert.equal((await request('/api/content')).status,401);cookie='';csrf='';let login=await request('/api/login','POST',{password});cookie=login.headers.get('set-cookie').split(';')[0];csrf=login.value.csrf;
      const reset=spawnSync(process.execPath,['scripts\\setup-admin.js','--reset'],{cwd:project,env:{...process.env,CMS_ADMIN_PASSWORD:crypto.randomBytes(30).toString('hex')},encoding:'utf8'});assert.equal(reset.status,0);assert.equal((await request('/api/content')).status,401);cookie='';csrf='';let last;for(let i=0;i<9;i++)last=await request('/api/login','POST',{password:'incorrect'});assert.equal(last.status,429);
    });
  }finally{if(server?.listening)await stop();fs.rmSync(directory,{recursive:true,force:true});}
});
