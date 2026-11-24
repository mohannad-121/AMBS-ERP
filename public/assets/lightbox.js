/* Image viewer: click any record picture to see it enlarged in the centre of the screen. */
'use strict';
(function(){
  let viewer=null, lastFocus=null;

  function close(){
    if(!viewer)return;
    const v=viewer; viewer=null;
    v.classList.remove('open');
    v.addEventListener('transitionend',()=>v.remove(),{once:true});
    setTimeout(()=>v.remove(),400);
    lastFocus?.focus?.();
  }

  function open(img){
    close();
    lastFocus=document.activeElement;
    const v=document.createElement('div');
    v.className='img-viewer';
    v.setAttribute('role','dialog');
    v.setAttribute('aria-modal','true');
    v.setAttribute('aria-label',img.alt||'Image preview');
    const figure=document.createElement('figure');
    figure.className='img-viewer-frame';
    const big=document.createElement('img');
    big.src=img.currentSrc||img.src;
    big.alt=img.alt||'';
    const button=document.createElement('button');
    button.type='button';
    button.className='img-viewer-close';
    button.setAttribute('aria-label','Close image');
    button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    figure.append(button,big);
    if(img.alt){
      const caption=document.createElement('figcaption');
      caption.textContent=img.alt;
      figure.append(caption);
    }
    v.append(figure);
    v.addEventListener('click',e=>{if(e.target===v||e.target.closest('.img-viewer-close'))close();});
    document.body.append(v);
    viewer=v;
    requestAnimationFrame(()=>v.classList.add('open'));
    button.focus({preventScroll:true});
  }

  document.addEventListener('click',e=>{
    const img=e.target.closest?.('img.thumb');
    if(!img||img.closest('.img-viewer')||!img.src)return;
    e.preventDefault();
    e.stopPropagation();
    open(img);
  },true);

  document.addEventListener('keydown',e=>{
    if(viewer&&e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}
  },true);
})();
