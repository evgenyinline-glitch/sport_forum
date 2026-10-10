'use strict';
(() => {
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const header = $('#header');
const menuButton = $('.menu-toggle');
const menu = $('#mobile-menu');
if (header && menuButton && menu) {
 const setMenu = open => {
  menu.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  document.body.classList.toggle('menu-open', open);
  header.classList.toggle('menu-active', open);
 };
 menuButton.addEventListener('click', () => setMenu(menu.hidden));
 $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
 document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuButton.focus(); } });
 window.addEventListener('resize', () => { if (innerWidth > 800) setMenu(false); }, {passive:true});
}
if (header) {
 const updateHeader = () => header.classList.toggle('scrolled', scrollY > 70);
 window.addEventListener('scroll', updateHeader, {passive:true});
 updateHeader();
}
if ('IntersectionObserver' in window && !motion.matches) {
 document.documentElement.classList.add('js-motion');
 const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
 }), {threshold:.07, rootMargin:'0px 0px -12px 0px'});
 $$('.reveal').forEach(el => observer.observe(el));
}
const year = $('#year');
if (year) year.textContent = new Date().getFullYear();

// Плеер страницы «Видео»: большой play-кадр, затем нативные контролы
const clubVideo = $('#club-video');
const videoPlay = $('#video-play');
if (clubVideo && videoPlay) {
 const startPlay = () => {
  clubVideo.controls = true;
  clubVideo.play().catch(() => {});
 };
 videoPlay.addEventListener('click', startPlay);
 clubVideo.addEventListener('play', () => { videoPlay.classList.add('hidden'); });
 clubVideo.addEventListener('ended', () => { videoPlay.classList.remove('hidden'); clubVideo.controls = false; });
 clubVideo.addEventListener('error', () => { videoPlay.disabled = true; videoPlay.querySelector('.video-play-label').textContent = 'РОЛИК НЕДОСТУПЕН'; });
 clubVideo.addEventListener('loadedmetadata', () => {
  const d = $('#video-duration');
  if (d && isFinite(clubVideo.duration)) {
   const m = Math.floor(clubVideo.duration / 60), s = String(Math.round(clubVideo.duration % 60)).padStart(2, '0');
   d.textContent = m + ':' + s;
  }
 });
}

// Лайтбокс галереи/сертификата: перелистывание, возврат на страницу (без открытия в новой вкладке)
const lbLinks = $$('[data-lightbox]');
if (lbLinks.length) {
 const overlay = document.createElement('div');
 overlay.className = 'lightbox';
 overlay.hidden = true;
 overlay.innerHTML = '<button class="lb-close" type="button" aria-label="Закрыть и вернуться к галерее">×</button>' +
  '<button class="lb-prev" type="button" aria-label="Предыдущее фото">←</button>' +
  '<button class="lb-next" type="button" aria-label="Следующее фото">→</button>' +
  '<figure><img alt=""><figcaption><span class="lb-caption"></span><span class="lb-count"></span></figcaption></figure>';
 document.body.appendChild(overlay);
 const lbImg = overlay.querySelector('img');
 const lbFig = overlay.querySelector('figure');
 const lbCap = overlay.querySelector('.lb-caption');
 const lbCount = overlay.querySelector('.lb-count');
 const lbClose = overlay.querySelector('.lb-close');
 const lbPrev = overlay.querySelector('.lb-prev');
 const lbNext = overlay.querySelector('.lb-next');
 let group = [];
 let current = 0;
 let lastFocus = null;
 let busy = false;
 const preload = i => { const l = group[(i + group.length) % group.length]; if (l) { const im = new Image(); im.src = l.getAttribute('href'); } };
 const show = (i, dir) => {
  current = (i + group.length) % group.length;
  const a = group[current];
  const fig = a.closest('figure');
  const thumb = fig ? fig.querySelector('img') : null;
  const swap = () => {
   lbImg.src = a.getAttribute('href');
   lbImg.alt = thumb ? thumb.alt : (a.getAttribute('aria-label') || '');
   lbCap.textContent = fig && fig.querySelector('figcaption') ? fig.querySelector('figcaption').textContent : '';
   lbCount.textContent = group.length > 1 ? (current + 1) + ' / ' + group.length : '';
   const single = group.length < 2;
   lbPrev.hidden = single;
   lbNext.hidden = single;
   preload(current + 1);
   preload(current - 1);
  };
  // Плавная смена кадра: уход в сторону, вход с противоположной
  if (!motion.matches && overlay.classList.contains('open') && dir) {
   busy = true;
   lbFig.classList.add(dir > 0 ? 'leave-left' : 'leave-right');
   setTimeout(() => {
    lbFig.classList.remove('leave-left', 'leave-right');
    swap();
    lbFig.classList.add('no-transition', dir > 0 ? 'enter-right' : 'enter-left');
    void lbFig.offsetWidth; // reflow: мгновенно применить стартовое состояние входа
    lbFig.classList.remove('no-transition', 'enter-right', 'enter-left');
    busy = false;
   }, 240);
  } else swap();
 };
 const open = a => {
  group = lbLinks.filter(l => l.dataset.lightbox === a.dataset.lightbox);
  lastFocus = document.activeElement;
  overlay.hidden = false;
  document.body.classList.add('lightbox-open');
  show(Math.max(0, group.indexOf(a)));
  void overlay.offsetWidth; // reflow: зафиксировать opacity:0 до добавления .open
  overlay.classList.add('open');
  lbClose.focus();
 };
 const close = () => {
  overlay.classList.remove('open');
  overlay.hidden = true;
  document.body.classList.remove('lightbox-open');
  lbImg.src = '';
  if (lastFocus) lastFocus.focus();
 };
 lbLinks.forEach(a => a.addEventListener('click', e => { e.preventDefault(); open(a); }));
 lbClose.addEventListener('click', close);
 lbPrev.addEventListener('click', () => { if (!busy) show(current - 1, -1); });
 lbNext.addEventListener('click', () => { if (!busy) show(current + 1, 1); });
 overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
 document.addEventListener('keydown', e => {
  if (overlay.hidden) return;
  if (e.key === 'Escape') close();
  else if (e.key === 'ArrowLeft') { if (!busy) show(current - 1, -1); }
  else if (e.key === 'ArrowRight') { if (!busy) show(current + 1, 1); }
  else if (e.key === 'Tab') {
   const focusables = [lbClose, lbPrev, lbNext].filter(b => !b.hidden);
   const first = focusables[0];
   const last = focusables[focusables.length - 1];
   if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
   else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
 });
 let touchX = null;
 overlay.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, {passive: true});
 overlay.addEventListener('touchend', e => {
  if (touchX === null || group.length < 2) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 45 && !busy) show(dx < 0 ? current + 1 : current - 1, dx < 0 ? 1 : -1);
  touchX = null;
 }, {passive: true});
}
})();
