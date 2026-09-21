'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = __dirname;
const dataDir = path.resolve(process.env.CMS_DATA_DIR || path.join(root, 'data'));
const mediaDir = process.env.CMS_DATA_DIR ? path.join(dataDir, 'media') : path.join(root, 'media');
const collections = ['packages', 'teams', 'testimonials', 'posts', 'gallery'];
const fields = {
  packages: { name:120, title:240, summary:600, content:24000, hotel:200, flight:200, duration:100, tutor:200, price:120, category:['umroh','plus','wisata'], brochure:200, status:['confirmation','available','closed'], validUntil:10 },
  teams: { name:160, position:160, content:3000 },
  testimonials: { name:160, content:5000, rating:'rating' },
  posts: { title:240, summary:600, content:30000, date:10 },
  gallery: { title:200, caption:2000 }
};
function atomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive:true, mode:0o700 });
  const stage = `${file}.${crypto.randomBytes(6).toString('hex')}.stage`;
  let fd;
  try { fd = fs.openSync(stage, 'wx', 0o600); fs.writeFileSync(fd, JSON.stringify(data,null,2)); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined; fs.renameSync(stage,file); }
  finally { if (fd !== undefined) fs.closeSync(fd); if(fs.existsSync(stage)) fs.unlinkSync(stage); }
}
function fail(message) { const e = new Error(message); e.status = 400; throw e; }
function date(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value; }
function media(value) {
  if (!value) return '';
  if (!/^\/media\/[a-zA-Z0-9-]+\.(png|jpg|jpeg|webp)$/.test(value)) fail('Pilih gambar dari pustaka media.');
  const file = path.join(mediaDir,path.basename(value));
  if (!fs.existsSync(file) || !fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) fail('Gambar tidak ditemukan.');
  return value;
}
function validate(type,input, previous) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Objek konten diperlukan.');
  const schema = { ...fields[type], image:200, sourceNote:600, published:'boolean', order:'order' };
  if (Object.keys(input).some(k => !Object.hasOwn(schema,k) && !['id','updatedAt'].includes(k))) fail('Kolom tidak dikenal.');
  const out = {};
  for (const [key, rule] of Object.entries(schema)) {
    const v = input[key] ?? (rule === 'boolean' ? false : rule === 'order' ? 0 : rule === 'rating' ? 5 : '');
    if (Array.isArray(rule)) { if(!rule.includes(v)) fail(`Nilai ${key} tidak valid.`); }
    else if(rule === 'boolean') { if(typeof v !== 'boolean') fail('Status publikasi tidak valid.'); }
    else if(rule === 'order' || rule === 'rating') { if(!Number.isInteger(v) || v < (rule==='rating'?1:0) || v > (rule==='rating'?5:9999)) fail(`Nilai ${key} tidak valid.`); }
    else if(typeof v !== 'string' || v.length > rule || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) fail(`Kolom ${key} terlalu panjang atau tidak valid.`);
    out[key] = typeof v === 'string' ? v.trim() : v;
  }
  for (const key of ['image', ...(type==='packages'?['brochure']:[])]) out[key] = media(out[key]);
  for (const key of ['name','title'].filter(k => Object.hasOwn(schema,k))) if(!out[key]) fail(`${key} wajib diisi.`);
  if (type==='testimonials' && !out.content) fail('Testimoni wajib diisi.');
  if (type==='gallery' && !out.image) fail('Galeri memerlukan gambar.');
  if (type==='posts' && (!date(out.date) || !out.content)) fail('Tanggal dan isi artikel wajib diisi.');
  if (type==='packages' && ((out.validUntil && !date(out.validUntil)) || (out.status==='available' && (!date(out.validUntil) || out.validUntil < new Date().toISOString().slice(0,10))))) fail('Paket tersedia memerlukan batas konfirmasi yang masih berlaku.');
  return { ...out, id:previous?.id || crypto.randomUUID(), updatedAt:new Date().toISOString() };
}
function init() {
  fs.mkdirSync(dataDir, {recursive:true,mode:0o700}); fs.mkdirSync(mediaDir,{recursive:true});
  const file = path.join(dataDir,'content.json');
  if(!fs.existsSync(file)) atomic(file, JSON.parse(fs.readFileSync(path.join(root,'data','seed.json'),'utf8')));
  const state = JSON.parse(fs.readFileSync(file,'utf8'));
  if(state.version!==1 || collections.some(k => !Array.isArray(state[k]))) throw new Error('Invalid content store. Restore a verified backup.');
  return { state, save(next) { atomic(file,next); this.state=next; } };
}
module.exports = { root, dataDir, mediaDir, collections, fields, atomic, validate, init, fail };
