'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { page } = require('../render');
test('each published package and its detail have a named, encoded WhatsApp draft', () => {
  const names = ['Reguler & Keluarga + Mei', 'VIP "Ramadhan" <2027>'];
  const packages = names.map((name,i)=>({id:`test-${i}`,name,title:'Program',published:true,order:i,summary:'',content:'',image:'',status:'confirmation'}));
  const state={packages,teams:[],testimonials:[],posts:[],gallery:[]};
  const home=page('/',state);
  assert.equal((home.match(/class="button button-wine package-whatsapp"/g)||[]).length,2);
  for (const p of packages) {
    for (const html of [home,page(`/paket/${p.id}`,state)]) {
      const links=[...html.matchAll(/class="button button-wine package-whatsapp" href="([^"]+)"/g)];
      assert.ok(links.some(([,href])=>new URL(href).searchParams.get('text').includes(p.name)));
    }
  }
  packages[0].name='Promo baru';
  assert.ok(page('/',state).includes(encodeURIComponent('paket Promo baru.')));
  packages[1].published=false;
  assert.equal((page('/',state).match(/class="button button-wine package-whatsapp"/g)||[]).length,1);
});
