'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const readline = require('node:readline');
const { dataDir, atomic } = require('../cms-store');
async function main() {
  const reset = process.argv.includes('--reset');
  const file = path.join(dataDir,'auth.json');
  if(fs.existsSync(file) && !reset) throw new Error('Admin sudah disiapkan. Gunakan --reset untuk mengganti password.');
  let password = process.env.CMS_ADMIN_PASSWORD;
  delete process.env.CMS_ADMIN_PASSWORD;
  if (!password) {
    if(!process.stdin.isTTY) throw new Error('Jalankan di terminal interaktif atau tetapkan CMS_ADMIN_PASSWORD.');
    process.stdout.write('Password admin baru (minimal 14 karakter; input disembunyikan): ');
    readline.emitKeypressEvents(process.stdin); process.stdin.setRawMode(true); process.stdin.resume();
    password = await new Promise((resolve,reject) => {
      let value='';
      const listener=(text,key={}) => {
        if(key.ctrl && key.name==='c') { done(); reject(new Error('Dibatalkan.')); }
        else if(key.name==='return' || key.name==='enter') { done(); resolve(value); }
        else if(key.name==='backspace') value=value.slice(0,-1);
        else if(text && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f]/.test(text)) value+=text;
      };
      function done() { process.stdin.off('keypress',listener); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); }
      process.stdin.on('keypress',listener);
    });
  }
  if(password.length<14 || password.length>128) throw new Error('Password harus 14–128 karakter.');
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.scryptSync(password,salt,64).toString('hex');
  atomic(file, { salt,hash,revision:crypto.randomUUID(),createdAt:new Date().toISOString() });
  console.log('Admin siap. Login di /admin dengan password tersebut (tanpa username). Sesi lama dinonaktifkan.');
}
main().catch(error=>{ console.error(error.message); process.exitCode=1; });
