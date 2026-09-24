'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { page } = require('../render');
const root = path.resolve(__dirname, '..');

function build(output = path.join(root, 'dist'), source = path.join(root, 'data', 'seed.json')) {
  const state = JSON.parse(fs.readFileSync(source, 'utf8'));
  const routes = ['/', '/blog', '/galeri', '/gallery', '/blog.html', '/galeri.html'];
  for (const [collection, prefix] of [['packages', 'paket'], ['posts', 'blog']]) {
    for (const item of state[collection].filter(item => item.published)) {
      if (!/^[a-zA-Z0-9-]+$/.test(item.id)) throw new Error('Invalid public content ID');
      routes.push(`/${prefix}/${item.id}`);
    }
  }
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  for (const route of routes) {
    const relative = route === '/' ? 'index.html' : route.endsWith('.html') ? route.slice(1) : `${route.slice(1)}/index.html`;
    const destination = path.join(output, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, page(route, state));
  }
  for (const name of ['styles.css', 'editorial.css', 'content.css', 'brand.css', 'app.js', 'brand-logo.png', 'bg1-web.mp4']) {
    fs.copyFileSync(path.join(root, name), path.join(output, name));
  }
  const images = new Set();
  for (const collection of ['packages', 'posts', 'gallery', 'teams', 'testimonials']) {
    for (const item of state[collection].filter(item => item.published)) {
      for (const field of ['image', 'brochure']) {
        if (item[field] && /^\/media\/[a-zA-Z0-9-]+\.(png|jpg|jpeg|webp)$/.test(item[field])) images.add(path.basename(item[field]));
      }
    }
  }
  fs.mkdirSync(path.join(output, 'media'), { recursive: true });
  for (const name of images) fs.copyFileSync(path.join(root, 'media', name), path.join(output, 'media', name));
  fs.writeFileSync(path.join(output, '404.html'), '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Halaman tidak ditemukan</title><h1>Halaman tidak ditemukan</h1><a href="/">Kembali ke beranda</a></html>');
  fs.mkdirSync(path.join(output, 'admin'), { recursive: true });
  fs.writeFileSync(path.join(output, 'admin', 'index.html'), '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pengelolaan konten</title><h1>Website publik statis</h1><p>CMS tidak tersedia pada deployment Netlify ini. Konten diperbarui melalui sumber konten dan deploy ulang. Gunakan deployment server Node.js untuk login dan mengelola CMS.</p><a href="/">Kembali ke beranda</a></html>');
  return routes;
}
if (require.main === module) console.log(`Generated ${build().length} public pages in dist`);
module.exports = { build };
