'use strict';
(() => {
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const fine = window.matchMedia('(hover:hover) and (pointer:fine)');
const header = $('#header');
const menuButton = $('.menu-toggle');
const menu = $('#mobile-menu');
function setMenu(open) {
 menu.hidden = !open;
 menuButton.setAttribute('aria-expanded', String(open));
 menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
 document.body.classList.toggle('menu-open', open);
 header.classList.toggle('menu-active', open);
}
menuButton.addEventListener('click', () => setMenu(menu.hidden));
$$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuButton.focus(); } });
window.addEventListener('resize', () => { if (innerWidth > 800) setMenu(false); }, {passive:true});
function updateHeader() { header.classList.toggle('scrolled', scrollY > 70); }
window.addEventListener('scroll', updateHeader, {passive:true}); updateHeader();
if ('IntersectionObserver' in window && !motion.matches) {
 document.documentElement.classList.add('js-motion');
 const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
 }), {threshold:.07, rootMargin:'0px 0px -12px 0px'});
 $$('.reveal').forEach(el => observer.observe(el));
}
const video = $('#hero-video');
const videoButton = $('#video-toggle');
const soundButton = $('#sound-toggle');
let userPaused = false;
let videoInView = true;
let soundWanted = false;
try { soundWanted = localStorage.getItem('sportforum-sound') === 'on'; } catch (_) {}
function updateVideoState() {
 const playing = !video.paused;
 videoButton.textContent = playing ? 'Ⅱ' : '▶';
 videoButton.setAttribute('aria-label', playing ? 'Приостановить видео' : 'Воспроизвести видео');
 videoButton.setAttribute('aria-pressed', String(playing));
}
async function playVideo() { try { await video.play(); } catch (_) { updateVideoState(); } }
function updateSound() {
 const enabled = !video.muted;
 soundButton.setAttribute('aria-pressed', String(enabled));
 soundButton.setAttribute('aria-label', enabled ? 'Выключить звук видео' : 'Включить звук видео');
 $('span',soundButton).textContent = enabled ? 'ЗВУК ВКЛ.' : 'ЗВУК ВЫКЛ.';
}
video.addEventListener('play', updateVideoState);
video.addEventListener('pause', updateVideoState);
video.addEventListener('error', () => { videoButton.disabled = true; videoButton.textContent = '—'; videoButton.setAttribute('aria-label','Видео недоступно — показано изображение'); });
videoButton.addEventListener('click', () => {
 if (video.paused) { userPaused = false; if (soundWanted) { video.muted = false; updateSound(); } playVideo(); }
 else { userPaused = true; video.pause(); }
});
soundButton.addEventListener('click', () => {
 video.muted = !video.muted; soundWanted = !video.muted; updateSound();
 try { localStorage.setItem('sportforum-sound', soundWanted ? 'on' : 'off'); } catch (_) {}
 if (video.paused) { userPaused = false; playVideo(); }
});
if (!motion.matches && !navigator.connection?.saveData) {
 if ('requestIdleCallback' in window) requestIdleCallback(() => { if (!userPaused && !document.hidden) playVideo(); }, {timeout:1600});
 else setTimeout(playVideo, 650);
}
if ('IntersectionObserver' in window) {
 new IntersectionObserver(entries => {
  videoInView = entries[0].isIntersecting;
  if (!videoInView) video.pause();
  else if (!userPaused && !motion.matches && !navigator.connection?.saveData && !document.hidden) playVideo();
 }, {threshold:0}).observe($('#home'));
}
document.addEventListener('visibilitychange', () => {
 if (document.hidden) video.pause();
 else if (!userPaused && !motion.matches && videoInView && !navigator.connection?.saveData) playVideo();
});
motion.addEventListener('change', () => { if (motion.matches) video.pause(); });
updateSound(); updateVideoState();
// Subtle snow, capped pixel ratio, no render work outside the first screen.
const canvas = $('#snow');
const ctx = canvas.getContext('2d');
if (ctx && !navigator.connection?.saveData) {
 let w, h, flakes = [], last = 0;
 function resizeSnow() {
  w = canvas.clientWidth; h = canvas.clientHeight;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = w*dpr; canvas.height = h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
  flakes = Array.from({length:innerWidth < 600 ? 23 : 54}, () => ({x:Math.random()*w,y:Math.random()*h,r:.4+Math.random()*1.2,v:7+Math.random()*16,a:.12+Math.random()*.42}));
 }
 function snowFrame(t) {
  const dt = Math.min((t-last)/1000,.05); last=t;
  if (!motion.matches && videoInView && !document.hidden && !userPaused) {
   ctx.clearRect(0,0,w,h);
   flakes.forEach(f => { f.y += f.v*dt; f.x += Math.sin(t/4000+f.y/120)*3*dt; if(f.y>h){f.y=-4;f.x=Math.random()*w;} ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fillStyle=`rgba(234,244,255,${f.a})`;ctx.fill(); });
  }
  requestAnimationFrame(snowFrame);
 }
 resizeSnow(); window.addEventListener('resize',resizeSnow,{passive:true}); requestAnimationFrame(snowFrame);
}
// Spring interpolation for magnetic actions; native pointer remains visible.
if (fine.matches && !motion.matches) {
 const cursor = $('#cursor');
 document.addEventListener('pointermove', e => { cursor.style.opacity = '.7'; cursor.style.transform = `translate(${e.clientX-12}px,${e.clientY-12}px)`; },{passive:true});
 document.addEventListener('pointerdown', () => { cursor.classList.add('clicked'); setTimeout(() => cursor.classList.remove('clicked'),240); });
 document.documentElement.addEventListener('pointerleave', () => cursor.style.opacity = '0');
 $$('.magnetic').forEach(button => {
  let tx=0,ty=0,x=0,y=0,vx=0,vy=0,frame=0;
  function spring() { vx=(vx+(tx-x)*.14)*.7;vy=(vy+(ty-y)*.14)*.7;x+=vx;y+=vy;button.style.transform=`translate(${x}px,${y}px)`; if(Math.abs(tx-x)+Math.abs(ty-y)+Math.abs(vx)+Math.abs(vy)>.06) frame=requestAnimationFrame(spring);else frame=0; }
  function run(){if(!frame)frame=requestAnimationFrame(spring);}
  button.addEventListener('pointermove', e => { if(motion.matches)return;const r=button.getBoundingClientRect();tx=Math.max(-9,Math.min(9,(e.clientX-r.left-r.width/2)*.09));ty=Math.max(-7,Math.min(7,(e.clientY-r.top-r.height/2)*.15));run(); });
  button.addEventListener('pointerleave', () => {tx=ty=0;run();});
 });
 $$('.program-card').forEach(card => {
  card.addEventListener('pointermove',e=>{if(motion.matches)return;const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(1000px) rotateX(${-y*2}deg) rotateY(${x*2}deg)`;});
  card.addEventListener('pointerleave',()=>{card.style.transform='';});
 });
}
$$('.button').forEach(button => button.addEventListener('click',()=>{if(!motion.matches&&navigator.vibrate)navigator.vibrate(8);}));
const tabs = $$('[role="tab"]');
function selectTab(tab) {
 tabs.forEach(t=>{const selected=t===tab;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;});
 $('#schedule-content').setAttribute('aria-labelledby',tab.id);
 $('#selected-arena').textContent=tab.dataset.arena==='Молодежка'?'ЛК «Молодежка»':'Ледовая арена «Крылатское»';
 $('#location').value=tab.dataset.arena;
}
tabs.forEach((tab,i)=>{
 tab.addEventListener('click',()=>{if(document.startViewTransition&&!motion.matches)document.startViewTransition(()=>selectTab(tab));else selectTab(tab);});
 tab.addEventListener('keydown',e=>{let index=i;if(e.key==='ArrowRight')index=(i+1)%tabs.length;else if(e.key==='ArrowLeft')index=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')index=0;else if(e.key==='End')index=tabs.length-1;else return;e.preventDefault();selectTab(tabs[index]);tabs[index].focus();});
});
$('#schedule-cta').addEventListener('click',()=>{$('#location').value=tabs.find(t=>t.getAttribute('aria-selected')==='true').dataset.arena;});
$$('[data-program]').forEach(a=>a.addEventListener('click',()=>{$('#program').value=a.dataset.program;}));
const phone=$('#phone');
phone.addEventListener('input',()=>phone.setCustomValidity(''));
const CLUB_EMAIL='kfksportforum@yandex.ru';
const CLUB_EMAIL2='sportforuminfo@ya.ru';
$('#enrollment-form').addEventListener('submit',async e=>{
 e.preventDefault();
 const digits=phone.value.replace(/\D/g,'');
 if(digits.length<10||digits.length>15){phone.setCustomValidity('Введите номер телефона: от 10 до 15 цифр.');phone.reportValidity();return;}
 const name=$('#name');
 if(name.value.trim().length<2){name.setCustomValidity('Укажите имя, не менее двух букв.');name.reportValidity();return;}
 const text=`Здравствуйте! Хочу узнать о занятиях в клубе «СпортФорум».\nИмя: ${name.value.trim()}.\nТелефон: ${phone.value.trim()}.\nНаправление: ${$('#program').value}.\nПлощадка: ${$('#location').value}.\nПодскажите, пожалуйста, расписание, стоимость и условия первого занятия.`;
 const subject=`Заявка с сайта СпортФорум — ${name.value.trim()}`;
 $('#message-text').value=text;
 $('#send-mail').href=`mailto:${CLUB_EMAIL},${CLUB_EMAIL2}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
 $('#form-result').hidden=false;$('#copy-status').textContent='';
 $('#form-result').querySelector('strong').textContent='Отправляем заявку на почту…';
 $('#form-result').scrollIntoView({behavior:motion.matches?'instant':'smooth',block:'nearest'});
 try{
  const res=await fetch('send-mail.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.value.trim(),phone:phone.value.trim(),program:$('#program').value,location:$('#location').value,website:''})});
  if(!res.ok)throw new Error('HTTP '+res.status);
  const data=await res.json().catch(()=>null);
  if(!data||data.ok!==true)throw new Error(data&&data.message?data.message:'send-mail failed');
  $('#form-result').querySelector('strong').textContent=`Заявка отправлена на почту ${CLUB_EMAIL} и ${CLUB_EMAIL2}. Мы скоро ответим.`;
 }catch(_){
  $('#form-result').querySelector('strong').textContent='Открываем письмо для отправки на почту клуба — нажмите «Отправить» в почтовой программе.';
  $('#copy-status').textContent='Если почтовая программа не открылась, нажмите «Отправить письмо ещё раз» или скопируйте текст.';
  try{window.location.href=$('#send-mail').href;}catch(__){}
 }
});
$('#name').addEventListener('input',()=>$('#name').setCustomValidity(''));
$('#copy-message').addEventListener('click',async()=>{
 try{if(!navigator.clipboard)throw new Error('clipboard unavailable');await navigator.clipboard.writeText($('#message-text').value);$('#copy-status').textContent='Текст скопирован. Обращение не отправлено в клуб.';}
 catch(_){$('#message-text').focus();$('#message-text').select();$('#copy-status').textContent='Текст выделен. Скопируйте его вручную: Ctrl+C или меню «Копировать».';}
});
const dialog=$('#privacy-dialog');
$('#privacy-open').addEventListener('click',()=>dialog.showModal());
$('.dialog-close',dialog).addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
$('#year').textContent=new Date().getFullYear();
})();
