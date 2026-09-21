// Reads only the four public content tables; never evaluates SQL or PHP.
const fs = require('node:fs');
const path = require('node:path');
const { rows } = require('./legacy-parser');
const root = path.resolve(__dirname, '..');
process.chdir(root);
function plain(value = '') {
  let text = value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<\/(?:p|div|h[1-6]|li)>|<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&(?:nbsp|amp|quot|apos|lt|gt);/g, e => ({ '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' })[e]).replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => { const c = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1),16) : Number(n); return c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : ''; });
  if (/[Ãâ]/.test(text) && [...text].every(c => c.charCodeAt(0) < 256)) { const decoded = Buffer.from(text, 'latin1').toString('utf8'); if (!decoded.includes('\ufffd')) text = decoded; }
  return text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
}
const manifest = [];
function image(name, base = 'upload/') {
  if (!name || !/^[^/\\]+\.(png|jpe?g|webp)$/i.test(name)) return '';
  const source = `public_html/src/img/${base}${name}`;
  let record = manifest.find(m => m.source === source);
  if (!record) { record = { source, target: `legacy-${manifest.length + 1}${path.extname(name).toLowerCase()}` }; manifest.push(record); }
  return `/media/${record.target}`;
}
function common(r, prefix, order) { return { id: `${prefix}-${r.id}`, published: true, order, image: image(r.image), sourceNote: `Arsip website lama · pembaruan ${r.updated_at.slice(0,10)}. Belum diverifikasi ulang.`, updatedAt: r.updated_at.replace(' ', 'T') + 'Z' }; }
const content = { version: 1, packages: [], teams: [], testimonials: [], posts: [], gallery: [] };
content.packages = rows('packages').map((r, i) => ({ ...common(r, 'paket', i), name: plain(r.name), title: plain(r.title), summary: plain(r.content).split('\n')[0].slice(0,450), content: plain(r.content), hotel: plain(r.hotel), flight: plain(r.flight), duration: `${r.duration} hari`, tutor: plain(r.tutor), price: plain(r.price), category: /wisata/i.test(r.name) ? 'wisata' : 'umroh', brochure: image(r.brosur), status: 'confirmation', validUntil: '', sourceNote: `Arsip paket lama (termasuk jadwal 2025). Harga, fasilitas, pembimbing, dan ketersediaan wajib dikonfirmasi. ${/\.pdf$/i.test(r.brosur) ? 'Brosur PDF lama tidak dipublikasikan.' : ''}`.trim() }));
content.teams = rows('teams').map((r,i) => ({ ...common(r,'tim',i), name: plain(r.name), position: plain(r.position), content: '' }));
content.testimonials = rows('testimonials').map((r,i) => ({ ...common(r,'cerita',i), name: plain(r.name), content: plain(r.content), rating: Math.min(5, Math.max(1, (plain(r.rating).match(/⭐/g) || []).length || 5)) }));
content.posts = rows('posts').map((r,i) => ({ ...common(r,'artikel',i), title: plain(r.title), summary: /Lorem ipsum/i.test(r.content) ? 'Draf contoh dari website lama — belum layak terbit.' : plain(r.content).slice(0,220), content: plain(r.content), date: r.updated_at.slice(0,10), published: !/Lorem ipsum/i.test(r.content) }));
content.gallery = [['mahabbah1.jpg','Mahabbah dalam arsip','Foto profil dari halaman publik website lama.'],['nabawi.png','Madinah, kota yang dirindukan','Visual Masjid Nabawi dari website lama; bukan bukti keberangkatan terkini.'],['pojok.png','Catatan visual perjalanan','Visual dari halaman publik website lama; lokasi dan tanggal belum diverifikasi.']].map(([name,title,caption],i) => ({ id:`galeri-${i+1}`, published:true, order:i, title, caption, image:image(name,''), sourceNote:'Koleksi visual website lama. Tanggal pengambilan tidak diketahui.', updatedAt:new Date().toISOString() }));
fs.writeFileSync(path.join(root,'data','seed.json'), JSON.stringify(content,null,2));
fs.writeFileSync(path.join(root,'scripts','media-manifest.json'), JSON.stringify(manifest,null,2));
console.log(`Imported public content only: ${content.packages.length} packages, ${content.teams.length} team profiles, ${content.testimonials.length} testimonials, ${content.posts.length} posts (${content.posts.filter(p=>p.published).length} published), ${content.gallery.length} gallery entries; ${manifest.length} approved image references.`);
