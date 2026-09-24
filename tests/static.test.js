'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('../scripts/build-static');
const { page } = require('../render');
const state = require('../data/seed.json');

test('Netlify export renders public content, resolves local links, and excludes private files', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'mahabbah-static-'));
  try {
    const routes = build(output);
    for (const route of routes) {
      const file = path.join(output, route === '/' ? 'index.html' : route.endsWith('.html') ? route.slice(1) : `${route.slice(1)}/index.html`);
      const html = fs.readFileSync(file, 'utf8');
      assert.equal(html, page(route, state));
      assert.ok(!html.includes('<!-- CMS:'));
      for (const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)[^\"]*"/g)) {
        const target = path.join(output, decodeURIComponent(match[1]));
        assert.ok(fs.existsSync(target), `Missing asset or route: ${match[1]} on ${route}`);
        if (fs.statSync(target).isDirectory()) assert.ok(fs.existsSync(path.join(target, 'index.html')));
      }
    }
    for (const [collection, prefix] of [['packages', 'paket'], ['posts', 'blog']]) {
      for (const item of state[collection]) assert.equal(routes.includes(`/${prefix}/${item.id}`), !!item.published);
    }
    for (const file of ['data', 'server.js', 'cms-server.js', 'admin.js', 'admin.html', 'Lampiran', '.git']) {
      assert.equal(fs.existsSync(path.join(output, file)), false);
    }
    assert.ok(fs.existsSync(path.join(output, '404.html')));
    assert.match(fs.readFileSync(path.join(output, 'admin', 'index.html'), 'utf8'), /CMS tidak tersedia/);
  } finally {
    fs.rmSync(output, { recursive: true, force: true });
  }
});
