'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { page } = require('../render');
const { fields } = require('../cms-store');
const root = path.resolve(__dirname, '..');
const seed = () => JSON.parse(fs.readFileSync(path.join(root, 'data', 'seed.json'), 'utf8'));

test('CMS renders one named tab/panel per published package in CMS order, never categories', () => {
  const state = seed();
  state.packages = Array.from({ length: 19 }, (_, i) => ({ ...state.packages[0], id:`fixture-${i}`, name:`Fixture ${i}`, category:fields.packages.category[i % 3], order:19-i, published:i !== 18 }));
  state.teams = Array.from({ length: 13 }, (_, i) => ({ ...state.teams[0], id:`team-${i}`, name:`Team ${i}` }));
  state.testimonials = Array.from({ length: 8 }, (_, i) => ({ ...state.testimonials[0], id:`quote-${i}`, name:`Quote ${i}` }));
  const html = page('/', state);
  const tabs = [...html.matchAll(/<button[^>]*role="tab"[^>]*>(.*?)<\/button>/g)];
  assert.equal(tabs.length, 18);
  assert.deepEqual(tabs.map(m=>m[1]), Array.from({length:18}, (_,i)=>`Fixture ${17-i}`));
  assert.equal((html.match(/class="journey-card"/g) || []).length, 18);
  assert.equal((html.match(/role="tabpanel"/g) || []).length, 18);
  assert.equal((html.match(/class="team-profile"/g) || []).length, 13);
  assert.equal((html.match(/class="testimonial"/g) || []).length, 8);
  assert.doesNotMatch(html, /Fixture 18|data-filter|data-category|Semua perjalanan|CMS:categories/);
  assert.equal((html.match(/data-page="next"/g) || []).length, 2);
  assert.equal((html.match(/data-package="next"/g) || []).length, 1);
  tabs.forEach((tab,i) => {
    assert.match(tab[0], new RegExp(`id="package-tab-${i}" role="tab" aria-controls="package-panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"`));
    assert.match(html, new RegExp(`id="package-panel-${i}" role="tabpanel" tabindex="0" aria-labelledby="package-tab-${i}"`));
  });
  state.packages.splice(1);
  state.packages[0].name = 'Updated CMS name';
  const one = page('/', state);
  assert.equal((one.match(/role="tab"/g) || []).length, 1);
  assert.equal((one.match(/role="tabpanel"/g) || []).length, 1);
  assert.match(one, />Updated CMS name<\/button>/);
  state.packages[0].published = false;
  assert.doesNotMatch(page('/', state), /role="tab"|role="tabpanel"|Updated CMS name/);
  state.packages = []; state.teams = []; state.testimonials = [];
  const empty = page('/', state);
  assert.equal((empty.match(/class="collection-empty">/g) || []).length, 3);
  assert.doesNotMatch(empty, /role="tab"|role="tabpanel"|class="(?:journey-card|team-profile|testimonial)"/);
  assert.match(empty, /Program sedang diperbarui/);
});

test('package labels use escaped CMS names with a title fallback and unique IDs for duplicates', () => {
  const state = seed();
  const p = state.packages[0];
  state.packages = [
    {...p, id:'first', name:'VIP <&> "special"', order:0},
    {...p, id:'second', name:'VIP <&> "special"', order:1},
    {...p, id:'third', name:'', title:'Ramadhan & Promo', order:2}
  ];
  const html = page('/', state);
  const labels = [...html.matchAll(/role="tab"[^>]*>(.*?)<\/button>/g)].map(m=>m[1]);
  assert.deepEqual(labels, ['VIP &lt;&amp;&gt; &quot;special&quot;', 'VIP &lt;&amp;&gt; &quot;special&quot;', 'Ramadhan &amp; Promo']);
  const ids = [...html.matchAll(/id="(package-(?:tab|panel)-\d+)"/g)].map(m=>m[1]);
  assert.equal(ids.length, 6); assert.equal(new Set(ids).size, 6);
});

function carouselFixture(categories, pageSize = 2) {
  const listeners = new Map();
  const bind = element => { element.addEventListener = (event, cb) => listeners.set([element.id, event].join(':'), cb); return element; };
  const card = category => ({ hidden:false, dataset:{category}, getBoundingClientRect:() => ({width:100}) });
  const track = bind({ id:'track', children:categories.map(card), scrollLeft:0, hidden:false, get clientWidth() { return pageSize * 120 - 20; }, get scrollWidth() { return Math.max(this.clientWidth, this.children.filter(c => !c.hidden).length * 120 - 20); }, scrollTo(options) { this.lastBehavior=options.behavior; this.scrollLeft=Math.max(0, Math.min(options.left, this.scrollWidth - this.clientWidth)); listeners.get('track:scroll')?.(); } });
  const previous = bind({id:'previous'}), next = bind({id:'next'}), status = {}, empty = {};
  const controls = { querySelector:selector => ({ '[data-page="previous"]':previous, '[data-page="next"]':next, '.collection-status':status })[selector] };
  const collection = { querySelector:selector => ({'.collection-track':track, '.collection-controls':controls, '.collection-empty':empty})[selector] };
  let resized, mutated;
  const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8').split("document.querySelectorAll('[data-carousel]')")[1].split("const dialog =")[0];
  vm.runInNewContext("document.querySelectorAll('[data-carousel]')" + source, {
    document:{querySelectorAll:() => [collection]}, motionPreference:{matches:true},
    getComputedStyle:() => ({getPropertyValue:() => pageSize, columnGap:'20px'}),
    requestAnimationFrame:cb => { cb(); return 1; }, cancelAnimationFrame(){},
    ResizeObserver:class { constructor(cb){ resized=cb; } observe(){} },
    MutationObserver:class { constructor(cb){ mutated=cb; } observe(){} }
  });
  return { track, previous, next, status, empty,
    click:id => listeners.get(id + ':click')(),
    key:key => listeners.get('track:keydown')({target:track,key,preventDefault(){}}),
    resize:size => {pageSize=size;resized();},
    replace:values => {track.children=values.map(card);mutated();}
  };
}

test('paging traverses more than one page, clamps final page, and supports keyboard/reduced motion', () => {
  const c = carouselFixture(Array(7).fill('umroh'));
  assert.equal(c.status.textContent, '1–2 dari 7'); assert.equal(c.previous.disabled, true); assert.equal(c.next.disabled, false);
  c.click('next'); assert.equal(c.status.textContent, '3–4 dari 7');
  c.key('End'); assert.equal(c.status.textContent, '6–7 dari 7'); assert.equal(c.next.disabled, true);
  c.key('ArrowLeft'); assert.equal(c.status.textContent, '4–5 dari 7');
  c.key('Home'); assert.equal(c.previous.disabled, true);
  c.key('ArrowRight'); assert.equal(c.status.textContent, '3–4 dari 7');
  assert.equal(c.track.lastBehavior, 'instant');
  c.resize(1); c.key('Home'); assert.equal(c.status.textContent, '1–1 dari 7');
});

test('team/testimonial sliders keep empty/small lists and live removals accurate', () => {
  const c = carouselFixture(Array(5).fill('team'));
  c.key('End'); c.replace(['team']);
  assert.equal(c.status.textContent, '1–1 dari 1'); assert.equal(c.track.scrollLeft, 0);
  assert.equal(c.previous.disabled, true); assert.equal(c.next.disabled, true);
  c.replace([]); assert.equal(c.status.textContent, '0 dari 0'); assert.equal(c.empty.hidden, false); assert.equal(c.track.hidden, true);
  assert.equal(c.previous.disabled, true); assert.equal(c.next.disabled, true);
  c.replace(Array(8).fill('team')); assert.equal(c.status.textContent, '1–2 dari 8'); assert.equal(c.next.disabled, false);
  assert.equal(c.empty.hidden, true); assert.equal(c.track.hidden, false);
});

function packageFixture(count, reducedMotion = true) {
  const listeners = new Map();
  let focused, scrolled;
  const bind = element => {
    element.addEventListener = (event, cb) => listeners.set(`${element.id}:${event}`, cb);
    return element;
  };
  const tabs = Array.from({length:count}, (_,i) => bind({
    id:`package-tab-${i}`, classList:{toggle(_name, value){ this.selected = value; }},
    setAttribute(key,value){ this[key] = value; },
    focus(options){ focused = {index:i, options}; },
    scrollIntoView(options){ scrolled = {index:i, options}; }
  }));
  const panels = tabs.map(()=>({hidden:false}));
  const tablist = {hidden:true, querySelectorAll:()=>tabs};
  const previous = bind({id:'previous'}), next = bind({id:'next'}), status = {};
  const controls = {hidden:true, querySelector:selector=>({'[data-package="previous"]':previous,'[data-package="next"]':next,'.collection-status':status})[selector]};
  const collection = {closest:()=>({querySelector:()=>tablist}), querySelectorAll:()=>panels, querySelector:()=>controls};
  const source = fs.readFileSync(path.join(root,'app.js'),'utf8').split("document.querySelectorAll('[data-package-tabs]')")[1].split("document.querySelectorAll('[data-carousel]')")[0];
  vm.runInNewContext("document.querySelectorAll('[data-package-tabs]')" + source, {document:{querySelectorAll:()=>[collection]},motionPreference:{matches:reducedMotion}});
  return {tabs,panels,tablist,controls,previous,next,status,
    get focused(){return focused;}, get scrolled(){return scrolled;},
    click:id=>listeners.get(`${id}:click`)(),
    key:(i,key)=>{let prevented=false;listeners.get(`package-tab-${i}:keydown`)({key,preventDefault(){prevented=true;}});return prevented;}
  };
}
function assertSelection(c, index) {
  assert.equal(c.panels.filter(p=>!p.hidden).length, 1);
  c.tabs.forEach((tab,i)=>{
    assert.equal(tab['aria-selected'], String(i===index));
    assert.equal(tab.tabIndex, i===index ? 0 : -1);
    assert.equal(tab.classList.selected, i===index);
    assert.equal(c.panels[i].hidden, i!==index);
  });
  assert.equal(c.status.textContent, `${index+1} dari ${c.tabs.length}`);
  assert.equal(c.previous.disabled, index===0);
  assert.equal(c.next.disabled, index===c.tabs.length-1);
}

test('package tabs select exactly one panel, rove focus, wrap arrows, and synchronize controls', () => {
  const c = packageFixture(19);
  assert.equal(c.tablist.hidden, false); assert.equal(c.controls.hidden, false);
  assertSelection(c,0); assert.equal(c.scrolled, undefined);
  c.click('package-tab-7'); assertSelection(c,7); assert.equal(c.scrolled.index,7);
  assert.equal(c.scrolled.options.behavior,'instant'); assert.equal(c.scrolled.options.inline,'nearest');
  c.click('next'); assertSelection(c,8);
  c.click('previous'); assertSelection(c,7);
  assert.equal(c.key(7,'End'),true); assertSelection(c,18); assert.equal(c.focused.index,18); assert.equal(c.focused.options.preventScroll,true);
  c.key(18,'ArrowRight'); assertSelection(c,0); assert.equal(c.scrolled.index,0);
  c.key(0,'ArrowLeft'); assertSelection(c,18);
  c.key(18,'Home'); assertSelection(c,0);
  c.key(0,'ArrowRight'); assertSelection(c,1);
  c.key(1,'ArrowLeft'); assertSelection(c,0);
  assert.equal(c.key(0,'Tab'),false); assertSelection(c,0);
  c.click('previous'); assertSelection(c,0);
  c.click('package-tab-18'); c.click('next'); assertSelection(c,18);
  const smooth = packageFixture(2,false); smooth.click('next'); assert.equal(smooth.scrolled.options.behavior,'smooth');
});

test('zero/one package avoid dead navigation and support single-tab keyboard', () => {
  const empty = packageFixture(0);
  assert.equal(empty.tablist.hidden,true); assert.equal(empty.controls.hidden,true);
  assert.equal(empty.previous.disabled,true); assert.equal(empty.next.disabled,true);
  assert.equal(empty.status.textContent,'0 dari 0');
  const one = packageFixture(1);
  assert.equal(one.tablist.hidden,false); assert.equal(one.controls.hidden,true); assertSelection(one,0);
  for (const key of ['ArrowLeft','ArrowRight','Home','End']) {one.key(0,key);assertSelection(one,0);}
});
