const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const heroVideo = document.querySelector('#hero-video');
const videoToggle = document.querySelector('#video-toggle');
const heroVisual = document.querySelector('.hero-visual');
heroVisual.insertBefore(heroVideo, heroVisual.querySelector('.image-shade'));
heroVideo.defaultMuted = true;
heroVideo.muted = true;
heroVideo.volume = 0;
heroVideo.addEventListener('volumechange', () => {
  if (!heroVideo.muted) heroVideo.muted = true;
  if (heroVideo.volume !== 0) heroVideo.volume = 0;
});
videoToggle.hidden = false;
function syncVideoButton() {
  videoToggle.textContent = heroVideo.paused ? '▷ Putar video' : 'Ⅱ Jeda video';
}
async function playHeroVideo() {
  heroVideo.muted = true;
  heroVideo.volume = 0;
  if (!heroVideo.getAttribute('src')) heroVideo.src = heroVideo.dataset.src;
  try {
    await heroVideo.play();
  } catch {
    syncVideoButton();
  }
}
heroVideo.addEventListener('playing', () => {
  heroVideo.classList.add('is-playing');
  syncVideoButton();
});
heroVideo.addEventListener('pause', syncVideoButton);
heroVideo.addEventListener('error', () => {
  heroVideo.classList.remove('is-playing');
  videoToggle.hidden = true;
});
videoToggle.addEventListener('click', () => {
  if (heroVideo.paused) playHeroVideo();
  else heroVideo.pause();
});
playHeroVideo();
if (!motionPreference.matches && 'IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.manifesto h2, .journey-card, .about-copy, .story-card, .preparation-intro').forEach(element => {
    element.classList.add('reveal-ready');
    revealObserver.observe(element);
  });
  motionPreference.addEventListener('change', event => {
    if (event.matches) {
      revealObserver.disconnect();
      document.querySelectorAll('.reveal-ready').forEach(element => element.classList.add('is-visible'));
    }
  });
}
const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Tutup navigasi' : 'Buka navigasi');
  navigation.classList.toggle('open', open);
});
navigation.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navigation.querySelectorAll('a').forEach(item => item.classList.remove('active'));
    link.classList.add('active');
    navigation.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Buka navigasi');
  });
});
document.querySelectorAll('[data-package-tabs]').forEach(root => {
  const tablist = root.closest('.package-browser').querySelector('[role="tablist"]');
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));
  const controls = root.querySelector('.collection-controls');
  const previous = controls.querySelector('[data-package="previous"]');
  const next = controls.querySelector('[data-package="next"]');
  const status = controls.querySelector('.collection-status');
  let active = 0;
  function select(index, focus = false, scroll = true) {
    active = Math.max(0, Math.min(tabs.length - 1, index));
    tabs.forEach((tab, i) => {
      const selected = i === active;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle('selected', selected);
      panels[i].hidden = !selected;
    });
    previous.disabled = active === 0;
    next.disabled = active >= tabs.length - 1;
    status.textContent = tabs.length ? `${active + 1} dari ${tabs.length}` : '0 dari 0';
    if (focus) tabs[active]?.focus({ preventScroll: true });
    if (scroll) tabs[active]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: motionPreference.matches ? 'instant' : 'smooth' });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', event => {
      const destinations = { ArrowLeft: (index - 1 + tabs.length) % tabs.length, ArrowRight: (index + 1) % tabs.length, Home: 0, End: tabs.length - 1 };
      if (!Object.hasOwn(destinations, event.key)) return;
      event.preventDefault();
      select(destinations[event.key], true);
    });
  });
  previous.addEventListener('click', () => select(active - 1));
  next.addEventListener('click', () => select(active + 1));
  tablist.hidden = tabs.length === 0;
  controls.hidden = tabs.length < 2;
  select(0, false, false);
});
document.querySelectorAll('[data-carousel]').forEach(root => {
  const track = root.querySelector('.collection-track');
  const controls = root.querySelector('.collection-controls');
  const previous = controls.querySelector('[data-page="previous"]');
  const next = controls.querySelector('[data-page="next"]');
  const status = controls.querySelector('.collection-status');
  const empty = root.querySelector('.collection-empty');
  const cards = () => Array.from(track.children).filter(card => !card.hidden);
  function sync() {
    const list = cards();
    empty.hidden = list.length > 0;
    track.hidden = list.length === 0;
    const size = Math.max(1, Number(getComputedStyle(track).getPropertyValue('--page-size')) || 1);
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = list.length ? list[0].getBoundingClientRect().width + gap : 1;
    const first = Math.max(0, Math.min(list.length - 1, Math.round(track.scrollLeft / step)));
    const end = Math.min(list.length, first + size);
    previous.disabled = !list.length || track.scrollLeft <= 2;
    next.disabled = !list.length || track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    status.textContent = list.length ? `${first + 1}–${end} dari ${list.length}` : '0 dari 0';
    return { list, size, step, first };
  }
  function move(direction) {
    const { size, step, first } = sync();
    track.scrollTo({ left: direction === 'start' ? 0 : direction === 'end' ? track.scrollWidth : (first + direction * size) * step, behavior: motionPreference.matches ? 'instant' : 'smooth' });
    sync();
  }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('keydown', event => {
    if (event.target !== track) return;
    const directions = { ArrowLeft: -1, ArrowRight: 1, Home: 'start', End: 'end' };
    if (!Object.hasOwn(directions, event.key)) return;
    event.preventDefault();
    move(directions[event.key]);
  });
  track.addEventListener('scroll', sync, { passive: true });
  function refresh() {
    track.scrollTo({ left: 0, behavior: 'instant' });
    sync();
  }
  controls.hidden = false;
  new ResizeObserver(sync).observe(track);
  new MutationObserver(refresh).observe(track, { childList: true });
  refresh();
});
const dialog = document.querySelector('#journey-dialog');
const month = document.querySelector('#travel-month');
const travelers = document.querySelector('#travelers');
const message = document.querySelector('#message');
const status = document.querySelector('#copy-status');
const whatsappLink = document.querySelector('#consult-whatsapp');
function syncWhatsApp() {
  whatsappLink.href = `https://wa.me/6281374970075?text=${encodeURIComponent(message.value)}`;
}
let selectedJourney = 'perjalanan umroh';
const now = new Date();
month.min = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
document.querySelector('#year').textContent = now.getFullYear();
function updateMessage() {
  const date = month.value ? new Date(`${month.value}-01T12:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : 'jadwal yang masih fleksibel';
  message.value = `Assalamu’alaikum, Mahabbah. Saya ingin berkonsultasi tentang ${selectedJourney} untuk ${travelers.value}, dengan rencana keberangkatan ${date}. Mohon informasi program yang tersedia, jadwal, harga, dan fasilitasnya. Terima kasih.`;
  status.textContent = '';
  syncWhatsApp();
}
function openConsultation(journey) {
  selectedJourney = journey;
  document.querySelector('#dialog-title').textContent = journey === 'perjalanan umroh' ? 'Mari bercerita.' : journey;
  updateMessage();
  dialog.showModal();
}
document.querySelectorAll('[data-journey]').forEach(button => {
  button.addEventListener('click', () => openConsultation(button.dataset.journey));
});
document.querySelector('#consult-button').addEventListener('click', () => openConsultation('perjalanan umroh'));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault();
    dialog.close();
  }
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
month.addEventListener('change', updateMessage);
travelers.addEventListener('change', updateMessage);
message.addEventListener('input', () => { status.textContent = ''; syncWhatsApp(); });
document.querySelector('#copy-message').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(message.value);
    status.textContent = 'Pesan berhasil disalin. Lanjutkan ke WhatsApp Mahabbah.';
  } catch {
    message.focus();
    message.select();
    status.textContent = 'Silakan salin pesan secara manual atau gunakan tombol Lanjut ke WhatsApp.';
  }
});
