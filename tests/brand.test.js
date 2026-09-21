'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');
const {page}=require('../render');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('original logo and archive palette are shared across public pages and CMS',()=>{
  const state=JSON.parse(read('data/seed.json'));
  for(const route of ['/','/blog','/galeri','/paket/paket-1','/blog/artikel-10002','/admin']){
    const html=route==='/admin'?read('admin.html'):page(route,state);
    assert.match(html,/href="\/?brand\.css"/);
    assert.match(html,/name="theme-color" content="#020617"/);
    assert.equal((html.match(/class="brand-logo"/g)||[]).length,route==='/admin'?1:2,route);
    assert.doesNotMatch(html,/<(?:audio|iframe|embed|object)\b/i);
  }
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'brand-logo.png'))).digest('hex'),'9512b05a7b9c1cd8a937251bc2dab8f9a5eb6649fb64d63087677abac7e82d21');
  for(const color of ['#020617','#eecc19','#f59e0b','#3a7930'])assert.ok(read('brand.css').includes(color));
  assert.match(read('cms-server.js'),/frame-src 'none'/);
});

test('optimized MP4 has video but no audio handler',()=>{
  const bytes=fs.readFileSync(path.join(root,'bg1-web.mp4'));
  const handlers=[];
  function boxes(start,end){
    for(let pos=start;pos+8<=end;){
      let size=bytes.readUInt32BE(pos),header=8;
      const type=bytes.toString('ascii',pos+4,pos+8);
      if(size===1){size=Number(bytes.readBigUInt64BE(pos+8));header=16;}
      if(size===0)size=end-pos;
      assert.ok(size>=header&&pos+size<=end,'valid MP4 box');
      if(['moov','trak','mdia'].includes(type))boxes(pos+header,pos+size);
      if(type==='hdlr')handlers.push(bytes.toString('ascii',pos+header+8,pos+header+12));
      pos+=size;
    }
  }
  boxes(0,bytes.length);
  assert.ok(handlers.includes('vide'));
  assert.ok(!handlers.includes('soun'));
});

test('video enforces silence, attempts inline autoplay and retains pause/resume',async()=>{
  assert.match(read('index.html'),/<video[^>]+autoplay muted loop playsinline/);
  const listeners={},buttons={};
  const video={paused:true,muted:false,volume:1,dataset:{src:'bg1-web.mp4'},classList:{add(){},remove(){}},getAttribute(){return this.src;},addEventListener(name,fn){listeners[name]=fn;},async play(){this.paused=false;listeners.playing();},pause(){this.paused=true;listeners.pause();}};
  const button={hidden:true,addEventListener(name,fn){buttons[name]=fn;}};
  const visual={insertBefore(){},querySelector(){return {};}};
  const source=read('app.js').split("if (!motionPreference.matches")[0];
  const context={window:{matchMedia:()=>({matches:false})},document:{querySelector:s=>({'#hero-video':video,'#video-toggle':button,'.hero-visual':visual})[s]}};
  vm.runInNewContext(source,context);
  await Promise.resolve();
  assert.equal(video.src,'bg1-web.mp4');assert.equal(video.paused,false);
  assert.equal(video.defaultMuted,true);assert.equal(video.muted,true);assert.equal(video.volume,0);
  video.muted=false;video.volume=1;listeners.volumechange();
  assert.equal(video.muted,true);assert.equal(video.volume,0);
  buttons.click();assert.equal(video.paused,true);
  buttons.click();await Promise.resolve();assert.equal(video.paused,false);
  assert.equal(button.hidden,false);
  video.pause();video.play=async()=>{throw Error('autoplay blocked');};
  buttons.click();await Promise.resolve();await Promise.resolve();
  assert.equal(video.paused,true);assert.match(button.textContent,/Putar video/);
});
