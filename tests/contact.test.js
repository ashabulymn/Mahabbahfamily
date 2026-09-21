'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { contact } = require('../contact');
test('contact uses verified profile details and a native WhatsApp draft form', () => {
  const html = contact();
  for (const text of ['91200059707560001','ptmahabbahfamily@gmail.com','0813-7497-0075','action="https://wa.me/6281374970075"','method="get"','name="text"','required','bukan chatbot otomatis']) assert.ok(html.includes(text), text);
  const message = 'Assalamu’alaikum & keluarga + 2 orang\nMei 2027';
  const url = new URL('https://wa.me/6281374970075');
  url.search = new URLSearchParams({text:message});
  assert.equal(url.searchParams.get('text'),message);
});
test('consultation synchronizes edited messages with WhatsApp', () => {
  const js = fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
  assert.match(js,/encodeURIComponent\(message.value\)/);
  assert.match(js,/message.addEventListener\('input',.*syncWhatsApp\(\)/);
});
