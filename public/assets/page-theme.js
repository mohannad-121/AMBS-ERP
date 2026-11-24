/* Tags <body data-page="..."> with the current sidebar section so styles can use that page's colour. */
'use strict';
(function(){
  const TOOLS=['tools','market','steel','prodcalc','prodcalc-new','nesting'];
  function update(){
    const route=(location.hash.match(/^#\/([a-z0-9-]+)/)||[,'dashboard'])[1];
    const page=TOOLS.includes(route)?'tools':route==='purchase-new'?'purchase':route==='plan-new'?'production':route;
    if(document.body.dataset.page!==page)document.body.dataset.page=page;
  }
  addEventListener('hashchange',update);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',update);else update();
})();
