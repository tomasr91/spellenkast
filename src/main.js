import { Capacitor } from '@capacitor/core';
import { InAppBrowser, DefaultWebViewOptions, DefaultAndroidWebViewOptions } from '@capacitor/inappbrowser';

const play = async (url) => {
  if (!Capacitor.isNativePlatform()) { window.open(url, '_blank', 'noopener'); return; }
  try {
    await InAppBrowser.openInWebView({
      url,
      options: {
        ...DefaultWebViewOptions,
        showURL: false,
        showNavigationButtons: false,
        closeButtonText: 'Terug',
        android: { ...DefaultAndroidWebViewOptions, hardwareBack: true, pauseMedia: true }
      }
    });
  } catch (err) {
    window.open(url, '_blank');
  }
};

const KEY='spellenkast-v1';
const COLORS=['#ff8a5c','#5ce1e6','#b28dff','#7be08a','#ffd83d','#ff6fa8','#6fa8ff'];
const DEFAULT=[
  {name:'Farflung',url:'https://farflung.game'},
  {name:'Krillion',url:'https://krillion.io'}
];
const shelf=document.getElementById('shelf');
const dlg=document.getElementById('dlg');
const form=document.getElementById('form');
const fname=document.getElementById('fname');
const furl=document.getElementById('furl');
const err=document.getElementById('err');
const editBtn=document.getElementById('edit');
let editing=false;

const load=()=>{try{const v=JSON.parse(localStorage.getItem(KEY));if(Array.isArray(v))return v}catch(e){}return DEFAULT.slice()};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(games))}catch(e){}};
let games=load();

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=s=>{let h=0;for(const ch of s)h=(h*31+ch.charCodeAt(0))>>>0;return h};
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return u}};

const art=(g,h)=>{
  const k=h%3,a='rgba(255,255,255,.55)',b='rgba(20,16,42,.28)';
  let shapes='';
  if(k===0){for(let i=0;i<5;i++)shapes+=`<circle cx="${30+i*38}" cy="${40+((h>>i)%60)}" r="${10+((h>>(i+2))%14)}" fill="${i%2?a:b}"/>`}
  else if(k===1){for(let i=0;i<6;i++)shapes+=`<rect x="${i*36}" y="${100-((h>>i)%70)}" width="26" height="${30+((h>>i)%70)}" rx="6" fill="${i%2?a:b}"/>`}
  else{for(let i=0;i<4;i++)shapes+=`<path d="M${-20+i*55} 150 L${20+i*55} ${30+((h>>i)%50)} L${60+i*55} 150Z" fill="${i%2?a:b}"/>`}
  const ch=esc((g.name.trim()[0]||'?').toUpperCase());
  return `<svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${shapes}<text x="168" y="44" font-family="Rubik" font-weight="800" font-size="40" fill="#14102a" text-anchor="middle">${ch}</text></svg>`;
};

const render=()=>{
  shelf.classList.toggle('editing',editing);
  shelf.innerHTML=games.map((g,i)=>{
    const h=hash(g.name+g.url),c=COLORS[h%COLORS.length];
    return `<a class="cart" style="--c:${c}" href="${esc(g.url)}" target="_blank" rel="noopener" data-i="${i}">
      <div class="art">${art(g,h)}</div><div class="grip"></div>
      <div class="label"><b>${esc(g.name)}</b><span>${esc(host(g.url))}</span></div>
      <button class="del" type="button" data-del="${i}" aria-label="Verwijder ${esc(g.name)}">×</button></a>`;
  }).join('')+`<button class="add" type="button" id="addBtn"><span><i>+</i><br>Spel toevoegen</span></button>`;
};

shelf.addEventListener('click',e=>{
  const d=e.target.closest('[data-del]');
  if(d){e.preventDefault();games.splice(+d.dataset.del,1);save();render();return}
  if(e.target.closest('#addBtn')){err.textContent='';form.reset();dlg.showModal();fname.focus();return}
  const cart=e.target.closest('.cart');
  if(cart){e.preventDefault();if(!editing)play(games[+cart.dataset.i].url)}
});
editBtn.addEventListener('click',()=>{editing=!editing;editBtn.textContent=editing?'Klaar':'Bewerken';editBtn.classList.toggle('on',editing);render()});
document.getElementById('cancel').addEventListener('click',()=>dlg.close());
form.addEventListener('submit',e=>{
  e.preventDefault();
  const name=fname.value.trim();let url=furl.value.trim();
  if(!name){err.textContent='Geef het spel een naam.';return}
  if(!/^https?:\/\//i.test(url))url='https://'+url;
  try{const u=new URL(url);if(!u.hostname.includes('.'))throw 0}catch(x){err.textContent='Dat lijkt geen geldig webadres.';return}
  games.push({name,url});save();render();dlg.close();
});
render();
