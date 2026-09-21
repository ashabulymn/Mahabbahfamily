'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { contact } = require('./contact');
function collection(id, label, gridClass, cards, empty) {
  return `<div class="collection" data-carousel="${id}" role="region" aria-label="${label}"><p class="collection-hint">Geser ke samping untuk melihat lainnya. Tinggi kartu mengikuti isi; gulir halaman untuk membaca teks panjang. Pada area kartu, gunakan ← →, Home atau End.</p><div id="${id}-cards" class="${gridClass} collection-track" tabindex="0" aria-label="${label}">${cards}</div><p class="collection-empty"${cards ? ' hidden' : ''}>${empty}</p><div class="collection-controls" hidden><p class="collection-status" role="status" aria-live="polite" aria-atomic="true"></p><div><button type="button" data-page="previous" aria-controls="${id}-cards" aria-label="${label} sebelumnya">&lt;</button><button type="button" data-page="next" aria-controls="${id}-cards" aria-label="${label} berikutnya">&gt;</button></div></div></div>`;
}
function packageTabs(state) {
  return published(state,'packages').map((p,i) => `<button type="button" id="package-tab-${i}" role="tab" aria-controls="package-panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"${i === 0 ? ' class="selected"' : ''}>${e(p.name || p.title)}</button>`).join('');
}
function packageCollection(state) {
  const count = published(state,'packages').length;
  return `<div class="collection" data-package-tabs><div id="package-panels" class="collection-track package-panels">${count ? packages(state) : ''}</div><p class="collection-empty"${count ? ' hidden' : ''}>Program sedang diperbarui. Silakan konsultasi dengan tim.</p><div class="collection-controls" hidden><p class="collection-status" role="status" aria-live="polite" aria-atomic="true"></p><div><button type="button" data-package="previous" aria-controls="package-panels" aria-label="Paket sebelumnya">&lt;</button><button type="button" data-package="next" aria-controls="package-panels" aria-label="Paket berikutnya">&gt;</button></div></div></div>`;
}
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const e = escape;
const published = (state,key) => state[key].filter(r=>r.published).sort((a,b)=>a.order-b.order);
const paragraphs = text => String(text || '').split(/\n+/).filter(Boolean).map(p=>`<p>${e(p)}</p>`).join('');
const image = (url,alt,cls='') => url && /^\/media\/[a-zA-Z0-9-]+\.(png|jpg|jpeg|webp)$/.test(url) ? `<img class="${cls}" src="${e(url)}" alt="${e(alt)}" loading="lazy">` : '';
function availability(p) {
  if(p.status==='closed') return 'Ingat kembali · pendaftaran ditutup';
  if(p.status==='available' && p.validUntil >= new Date().toISOString().slice(0,10)) return `Tersedia menurut pengelola · konfirmasi sebelum ${p.validUntil}`;
  return 'Arsip program · wajib konfirmasi ketersediaan';
}
function packageWhatsApp(p) {
  const name = p.name || p.title;
  const message = `Assalamu’alaikum, Mahabbah Family. Saya tertarik dengan paket ${name}. Mohon informasi jadwal keberangkatan, harga terbaru, fasilitas, dan ketersediaannya. Saya ingin berkonsultasi atau melanjutkan pemesanan paket ini. Terima kasih.`;
  return `<a class="button button-wine package-whatsapp" href="https://wa.me/6281374970075?text=${e(encodeURIComponent(message))}" target="_blank" rel="noopener noreferrer" aria-label="Tanya atau pesan paket ${e(name)} melalui WhatsApp">Tanya / pesan paket via WhatsApp ↗</a>`;
}
function packages(state) {
  const list=published(state,'packages');
  return list.map((p,i)=>`<article class="journey-card" id="package-panel-${i}" role="tabpanel" tabindex="0" aria-labelledby="package-tab-${i}"><a class="card-image" href="/paket/${e(p.id)}">${image(p.image,p.name)}<span class="card-tag">${e(availability(p))}</span><span class="card-number">${String(i+1).padStart(2,'0')} /</span></a><div class="card-body"><div class="card-kicker">${e(p.duration)} · ${e(p.flight)}</div><h3><a href="/paket/${e(p.id)}">${e(p.name)}</a></h3><p>${e(p.summary)}</p><p class="archive-label">Harga referensi arsip: ${e(p.price)} · bukan penawaran terkini</p><div class="card-footer"><span>${e(p.title)}</span><a class="round-button" href="/paket/${e(p.id)}" aria-label="Detail ${e(p.name)}">↗</a></div>${packageWhatsApp(p)}</div></article>`).join('') || '<p>Program sedang diperbarui. Silakan konsultasi dengan tim.</p>';
}
function teams(state) { return published(state,'teams').map(p=>`<article class="team-profile" tabindex="0" aria-label="${e(p.name)}">${image(p.image,p.name)}<div><h3>${e(p.name)}</h3><p class="card-kicker">${e(p.position)}</p>${paragraphs(p.content)}<small>${e(p.sourceNote)}</small></div></article>`).join('') || '<p>Profil tim sedang diperbarui.</p>'; }
function testimonials(state) { return published(state,'testimonials').map(p=>`<figure class="testimonial" tabindex="0" aria-label="${e(p.name)}">${image(p.image,p.name)}<blockquote>${paragraphs(p.content)}</blockquote><figcaption><strong>${e(p.name)}</strong> <span aria-label="${p.rating} dari 5 bintang">${'★'.repeat(p.rating)}</span><small>${e(p.sourceNote)}</small></figcaption></figure>`).join('') || '<p>Cerita jamaah sedang diperbarui.</p>'; }
function postLinks(state) { return published(state,'posts').map(p=>`<a href="/blog/${e(p.id)}" class="story-card"><span class="card-kicker">CATATAN · ${e(p.date)}</span><h3>${e(p.title)}</h3><p>${e(p.summary)}</p><span class="story-link">Baca catatan ↗</span></a>`).join('') || '<p>Belum ada artikel diterbitkan.</p>'; }
function home(state) {
  const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
  return html.replace('<!-- CMS:package-tabs -->',packageTabs(state))
      .replace('<!-- CMS:packages -->',packageCollection(state))
    .replace('<!-- CMS:teams -->',collection('teams','Profil tim','team-grid',published(state,'teams').length ? teams(state) : '', 'Profil tim sedang diperbarui.'))
    .replace('<!-- CMS:testimonials -->',collection('testimonials','Testimoni jamaah','testimonial-grid',published(state,'testimonials').length ? testimonials(state) : '', 'Cerita jamaah sedang diperbarui.'))
    .replace('<!-- CMS:posts -->',postLinks(state))
    .replace('</main>',`${contact()}</main>`);
}
function layout(title,intro,body) {
  const logo='<a class="brand" href="/" aria-label="Mahabbah beranda"><img class="brand-logo" src="/brand-logo.png" width="406" height="74" alt="Mahabbah Family Tour & Travel"></a>';
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#020617"><title>${e(title)} — Mahabbah</title><meta name="description" content="${e(intro)}"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/editorial.css"><link rel="stylesheet" href="/content.css"><link rel="stylesheet" href="/brand.css"></head><body><header class="site-header sub-header">${logo}<nav aria-label="Navigasi utama"><a href="/#perjalanan">Perjalanan</a><a href="/#tim">Tim</a><a href="/#testimoni">Testimoni</a><a href="/blog">Blog</a><a href="/galeri">Galeri</a></nav></header><main class="journal-page"><div class="chapter-label"><a href="/">← Beranda</a><span>THE MAHABBAH JOURNAL</span></div><header class="journal-heading"><span class="eyebrow">IMAN · KELUARGA · PERJALANAN</span><h1>${e(title)}</h1><p>${e(intro)}</p></header>${body}${contact()}</main><footer class="journal-footer">${logo}<p>Mahabbah Family Tour & Travel · Perjalanan hati.</p><a href="https://www.instagram.com/mahabbahfamilytourtravel/" target="_blank" rel="noopener noreferrer">Konsultasi melalui Instagram ↗</a><p>Konten arsip bukan bukti jadwal atau harga terkini. Konfirmasikan rincian dengan pengelola.</p></footer></body></html>`;
}
function page(url,state) {
  if(url==='/' || url==='/index.html') return home(state);
  if(['/blog','/blog.html'].includes(url)) return layout('Catatan perjalanan.','Cerita dan panduan dari arsip Mahabbah. Periksa ketentuan perjalanan terbaru sebelum berangkat.',`<div class="blog-index">${published(state,'posts').map(p=>`<article>${image(p.image,p.title)}<div><span class="card-kicker">${e(p.date)}</span><h2><a href="/blog/${e(p.id)}">${e(p.title)}</a></h2><p>${e(p.summary)}</p><a class="text-link" href="/blog/${e(p.id)}">Baca selengkapnya ↗</a></div></article>`).join('') || '<p>Belum ada artikel diterbitkan.</p>'}</div>`);
  if(['/galeri','/galeri.html','/gallery'].includes(url)) return layout('Yang tinggal di hati.','Koleksi visual dari website lama; tanggal dan konteks pengambilan belum diverifikasi.',`<div class="gallery-grid">${published(state,'gallery').map(p=>`<figure><a href="${e(p.image)}" target="_blank" rel="noopener">${image(p.image,p.title)}</a><figcaption><h2>${e(p.title)}</h2><p>${e(p.caption)}</p><small>${e(p.sourceNote)}</small></figcaption></figure>`).join('') || '<p>Galeri sedang diperbarui.</p>'}</div>`);
  const match=/^\/(paket|blog)\/([a-zA-Z0-9-]+)$/.exec(url);
  if(match) {
    const type=match[1]==='paket'?'packages':'posts'; const p=published(state,type).find(r=>r.id===match[2]); if(!p) return null;
    if(type==='posts') return layout(p.title,p.summary,`<article class="reading-body">${image(p.image,p.title)}<p class="source-note">${e(p.date)} · ${e(p.sourceNote)}</p>${paragraphs(p.content)}<a class="text-link" href="/blog">← Semua catatan</a></article>`);
    return layout(p.name,p.title,`<article class="package-detail"><div>${image(p.image,p.name)}${p.brochure?`<a class="text-link" href="${e(p.brochure)}" target="_blank" rel="noopener">Lihat brosur arsip (bukan penawaran terkini) ↗</a>`:''}</div><div><p class="availability-banner">${e(availability(p))}</p><p class="source-note">${e(p.sourceNote)}</p><dl>${[['Harga referensi arsip',p.price],['Durasi',p.duration],['Hotel (arsip)',p.hotel],['Penerbangan (arsip)',p.flight],['Pembimbing (arsip)',p.tutor]].map(([k,v])=>`<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join('')}</dl><p>Seluruh rincian di bawah berasal dari catatan program. Harga, jadwal, fasilitas, dan pembimbing dapat berubah; minta penawaran tertulis sebelum membayar.</p>${paragraphs(p.content)}${packageWhatsApp(p)}</div></article>`);
  }
  return null;
}
module.exports={ page,escape,availability };
