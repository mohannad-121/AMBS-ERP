/* AMBS Assistant — built-in help chat. Runs entirely in the browser: no external AI, no API key.
   Knowledge: /assets/assistant-guide.md (one "## " section per topic, with a "Keywords:" line).
   Smarts: synonym + Arabic-aware search with typo tolerance, intents (greetings, navigation, counts,
   page help, follow-ups) and live checks of the user's workspace. */
'use strict';
(function(){
  const STORE_KEY='ambs-assistant-chat-v2';
  const GUIDE_URL='/assets/assistant-guide.md';
  const SUGGESTIONS=[
    '📍 Why is the custody location list empty?',
    '🛒 How do I create a purchase request?',
    '🖼️ How do I add a product with a picture?',
    '🏭 How does a production order work?',
    '🚚 How do I pack and dispatch an order?',
    '💾 How do I back up my data?'
  ];

  /* ------------------------------------------------------------------
     Language helpers
     ------------------------------------------------------------------ */
  const isArabic=s=>/[؀-ۿ]/.test(s);
  function normalize(s){
    return String(s).toLowerCase()
      .replace(/[ً-ْـ]/g,'')
      .replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
      .replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
  }
  function stem(w){
    if(/[؀-ۿ]/.test(w)){
      w=w.replace(/^(وال|بال|كال|فال|لل|ال)/,'');
      if(w.length>4)w=w.replace(/(ات|ين|ون|ها|هم|نا)$/,'');
      return w;
    }
    if(w.length>5&&w.endsWith('ies'))return w.slice(0,-3)+'y';
    if(w.length>5&&w.endsWith('ing'))return w.slice(0,-3);
    if(w.length>4&&w.endsWith('ed'))return w.slice(0,-2);
    if(w.length>4&&w.endsWith('es')&&!w.endsWith('ses'))return w.slice(0,-2);
    if(w.length>3&&w.endsWith('s')&&!w.endsWith('ss'))return w.slice(0,-1);
    return w;
  }
  const STOP=new Set(('a an the and or of to in on at for from by with is are was be been do does did can could should would will '+
    'i me my we our you your it its this that these those there here what which who whom how why when where please pls plz '+
    'want need like get got have has had just also into about some any thing things way able use using '+
    'في من على الى عن مع هل كيف ماذا لماذا وين اين شو ايش ما هذا هذه ذلك تلك انا انت احنا ممكن بدي اريد عايز لو اذا يا').split(' '));

  /* Synonym groups → a shared concept token "§name" added to both queries and guide text. */
  const CONCEPTS={
    location:'location site warehouse store storage custody yard depot godown موقع مواقع مخزن مخازن مستودع عهده مكان',
    purchase:'purchase purchasing buy buying procurement po requisition شراء مشتريات اشتري اشتريت نشتري',
    supplier:'supplier vendor seller مورد موردين المورد',
    customer:'customer client buyer عميل عملاء زبون زباين',
    processor:'processor processing galvanizing galvanising painting coating subcontractor معالجه جلفنه دهان',
    product:'product products item finished net nets منتج منتجات شبكه شبك',
    part:'part component piece spare قطعه قطع جزء',
    material:'material raw steel tube pipe sheet profile aluminium aluminum ماده مواد خام حديد',
    production:'production manufacture manufacturing fabricate fabrication build make produce انتاج تصنيع تصنيعه',
    stock:'stock inventory balance quantity qty onhand available مخزون رصيد كميه كميات جرد',
    movement:'movement transfer move adjust adjustment issue receive receipt حركه نقل تحويل استلام',
    dispatch:'dispatch deliver delivery ship shipping shipment pack packing truck loading توصيل شحن تسليم تغليف تحميل',
    image:'image picture photo pic photograph thumbnail صوره صور',
    backup:'backup export import restore json download upload نسخه احتياطي استرجاع تصدير استيراد',
    login:'login signin sign password account email signup register otp code دخول تسجيل كلمه حساب ايميل',
    report:'report reports pdf csv print printout تقرير تقارير طباعه',
    bom:'bom recipe bill formula structure تركيبه وصفه',
    remove:'delete remove archive erase discard cancel حذف احذف امسح ارشفه الغاء',
    edit:'edit change update modify rename correct تعديل عدل غير تغيير',
    create:'add create new make register insert اضافه اضيف ضيف جديد انشاء اعمل',
    settings:'settings setup configuration company profile اعدادات ضبط',
    error:'error problem issue fail failed failing cannot cant unable wrong stuck broken خطا مشكله غلط مش ما',
    empty:'empty missing blank nothing none disappeared فاضي فارغ مفقود',
    tool:'tool tools calculator calculate weight nesting cutting cut حاسبه حساب وزن قص',
    status:'status state stage draft released completed cancelled open closed حاله مرحله',
    plan:'plan plans planning schedule reserve reservation خطه تخطيط حجز',
    unit:'unit units uom kg pcs meter metre وحده وحدات',
    variant:'variant variants size color colour sku مقاس لون',
    permission:'admin staff role permission access allowed صلاحيه صلاحيات مدير موظف'
  };
  const CONCEPT_OF=new Map();
  for(const [name,list] of Object.entries(CONCEPTS))for(const w of list.split(' '))CONCEPT_OF.set(stem(normalize(w)),'§'+name);

  function tokens(text){
    const out=[];
    for(const raw of normalize(text).split(' ')){
      if(!raw||STOP.has(raw)||raw.length<2)continue;
      const w=stem(raw);
      if(!w||STOP.has(w))continue;
      out.push(w);
      const c=CONCEPT_OF.get(w)||CONCEPT_OF.get(raw);
      if(c)out.push(c);
    }
    return out;
  }
  function lev(a,b){
    if(Math.abs(a.length-b.length)>1)return 2;
    const d=Array.from({length:a.length+1},(_,i)=>[i]);
    for(let j=1;j<=b.length;j++)d[0][j]=j;
    for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)
      d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    return d[a.length][b.length];
  }

  /* ------------------------------------------------------------------
     Guide index
     ------------------------------------------------------------------ */
  let sections=null, vocab=null, idf=null;
  async function loadGuide(){
    if(sections)return sections;
    const text=await (await fetch(GUIDE_URL,{cache:'no-store'})).text();
    sections=text.replace(/\r/g,'').split(/\n(?=## )/).slice(1).map((block,id)=>{
      const title=block.match(/^##\s+(.*)/)[1].trim();
      const keywords=(block.match(/^Keywords:\s*(.*)$/m)||[,''])[1];
      const body=block.replace(/^##.*\n/,'').replace(/^Keywords:.*\n?/m,'').trim();
      const routes=[...new Set([...body.matchAll(/#\/([a-z0-9-]+)/g)].map(m=>m[1]))];
      return {id,title,keywords,body,routes,
        t:new Set(tokens(title)),k:new Set(tokens(keywords)),b:tokens(body),normTitle:normalize(title)};
    });
    vocab=new Set(); const df=new Map();
    for(const s of sections){
      const all=new Set([...s.t,...s.k,...s.b]);
      for(const w of all){vocab.add(w);df.set(w,(df.get(w)||0)+1);}
    }
    idf=w=>Math.log(1+sections.length/(1+(df.get(w)||0)));
    return sections;
  }
  function correct(words){
    return words.map(w=>{
      if(w.startsWith('§')||vocab.has(w)||w.length<5)return w;
      for(const v of vocab)if(!v.startsWith('§')&&lev(w,v)<=1)return v;
      return w;
    });
  }
  function search(query,{boost=null}={}){
    const q=[...new Set(correct(tokens(query)))];
    if(!q.length)return [];
    const nq=normalize(query), pairs=[];
    const words=nq.split(' ').filter(w=>!STOP.has(w));
    for(let i=0;i<words.length-1;i++)pairs.push(words[i]+' '+words[i+1]);
    return sections.map(s=>{
      let score=0, hit=0;
      for(const w of q){
        const weight=idf(w)*(w.startsWith('§')?.8:1);
        let h=0;
        if(s.t.has(w)){score+=6*weight;h=1;}
        if(s.k.has(w)){score+=4*weight;h=1;}
        const c=s.b.reduce((n,x)=>n+(x===w),0);
        if(c){score+=Math.min(3,c)*.7*weight;h=1;}
        hit+=h;
      }
      for(const p of pairs)if(s.normTitle.includes(p))score+=5;
      if(nq.length>8&&s.normTitle===nq)score+=40;
      score*=.6+.4*(hit/q.length);
      if(boost!=null&&s.id===boost)score+=3;
      return {s,score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  }

  /* ------------------------------------------------------------------
     Live workspace knowledge
     ------------------------------------------------------------------ */
  const hasState=()=>typeof state!=='undefined'&&state;
  const live=t=>hasState()&&Array.isArray(state[t])?state[t].filter(r=>r.active!==false):[];
  const custodyList=()=>{try{return typeof custody==='function'?custody():[];}catch{return [];}};
  const pageName=r=>(typeof TITLES!=='undefined'&&TITLES[r])||r;
  const ENTITIES=[
    ['customers','customer client عميل عملاء زبون','👥'],['suppliers','supplier vendor مورد موردين','🏢'],
    ['processors','processor processing معالجه','🏭'],['materials','material raw ماده مواد خام','🧱'],
    ['parts','part component قطع قطعه','🔩'],['products','product منتج منتجات','📦'],['variants','variant sku مقاس','🎨'],
    ['locations','location custody warehouse موقع مواقع مخزن','📍'],['orders','production order انتاج','🏭'],
    ['plans','plan خطه','🗓️'],['purchases','purchase شراء مشتريات','🛒'],['jobs','dispatch delivery توصيل شحن','🚚'],
    ['events','movement حركه حركات','🔄']
  ];
  function countAnswer(query,ar){
    if(!hasState())return null;
    const q=normalize(query);
    for(const [table,words,icon] of ENTITIES){
      if(!words.split(' ').some(w=>q.includes(normalize(w))))continue;
      const list=table==='locations'?custodyList():table==='events'?(state.events||[]):live(table);
      const label=table==='locations'?'custody (stock) locations':table==='orders'?'production orders':table==='jobs'?'dispatch jobs':table==='events'?'stock movements':table;
      let extra='';
      if(['orders','plans','purchases','jobs'].includes(table)){
        const by={};for(const r of state[table]||[])by[r.status||'—']=(by[r.status||'—']||0)+1;
        const parts=Object.entries(by).map(([k,v])=>`**${v}** ${k}`);
        if(parts.length)extra='\n\nBy status: '+parts.join(' · ');
      }
      if(table==='locations'&&list.length)extra='\n\n'+list.slice(0,12).map(l=>'- 📍 '+l.name).join('\n');
      const route={customers:'customers',suppliers:'suppliers',processors:'processors',materials:'materials',parts:'parts',
        products:'products',variants:'products',locations:'settings',orders:'production',plans:'production',purchases:'purchase',jobs:'dispatch',events:'movement'}[table];
      return (ar?`${icon} عندك حالياً **${list.length}** ${label}.`:`${icon} You currently have **${list.length}** active ${label}.`)+extra+
        `\n\n👉 See them in [${pageName(route)}](#/${route})`;
    }
    return null;
  }
  /* Personalised notes added under guide answers. */
  function diagnose(concepts,ar){
    if(!hasState())return '';
    const notes=[], has=c=>concepts.has('§'+c);
    if(has('location')){
      const c=custodyList();
      notes.push(c.length
        ?(ar?`📍 عندك ${c.length} موقع مخزون: ${c.slice(0,6).map(l=>'**'+l.name+'**').join('، ')}`:`📍 Your stock locations right now: ${c.slice(0,6).map(l=>'**'+l.name+'**').join(', ')}${c.length>6?' …':''}`)
        :(ar?'⚠️ **حالياً عندك 0 مواقع مخزون** — لهذا السبب قائمة المواقع فاضية. أضف موقع من [Settings & Data](#/settings) ← **Add Custody Location**.'
            :'⚠️ **Right now you have 0 custody locations** — that is why location lists are empty. Add one in [Settings & Data](#/settings) → **Add Custody Location**.'));
    }
    if(has('purchase')&&!live('suppliers').length)notes.push(ar?'⚠️ ما عندك موردين بعد — أضف مورد أولاً من [Suppliers](#/suppliers).':'⚠️ You have no active suppliers yet — add one first in [Suppliers](#/suppliers).');
    if(has('purchase')&&!live('materials').length&&!live('parts').length)notes.push(ar?'⚠️ ما عندك مواد أو قطع لتشتريها — أضفها من [Raw Materials](#/materials) أو [Parts](#/parts).':'⚠️ There are no raw materials or parts to buy yet — add them in [Raw Materials](#/materials) or [Parts](#/parts).');
    if(has('production')&&!live('products').length&&!live('parts').length)notes.push(ar?'⚠️ ما عندك منتجات أو قطع لإنتاجها بعد.':'⚠️ You have no products or parts to produce yet — add them first.');
    if(has('dispatch')&&!live('customers').length)notes.push(ar?'⚠️ ما عندك عملاء بعد — أضف عميل من [Customers](#/customers).':'⚠️ You have no customers yet — add one in [Customers](#/customers).');
    if(has('stock')){try{const w=typeof warningRows==='function'?warningRows().length:0;if(w)notes.push(ar?`🔔 عندك **${w}** تنبيه مخزون — شوفها في [Dashboard](#/dashboard).`:`🔔 You have **${w}** stock warning${w>1?'s':''} — see the [Dashboard](#/dashboard).`);}catch{}}
    return notes.length?'\n\n---\n'+(ar?'💡 **في مساحة عملك:**\n':'💡 **In your workspace:**\n')+notes.map(n=>'- '+n).join('\n'):'';
  }

  /* ------------------------------------------------------------------
     Pages & navigation
     ------------------------------------------------------------------ */
  const PAGE_ALIASES={
    dashboard:'dashboard home main overview الرئيسيه لوحه داشبورد',customers:'customers clients عملاء زباين',
    suppliers:'suppliers vendors موردين',processors:'processing companies processors معالجه',
    materials:'raw materials materials مواد خام',parts:'parts قطع',bom:'bom bill of materials تركيبه',
    products:'products منتجات',production:'production انتاج تصنيع',purchase:'purchasing purchase مشتريات شراء',
    movement:'inventory stock movements مخزون حركات',dispatch:'dispatch packing delivery توصيل شحن تغليف',
    reports:'reports تقارير',tools:'tools ادوات',settings:'settings data backup اعدادات',
    steel:'steel weight calculator حاسبه الوزن',nesting:'nesting cutting قص',prodcalc:'product calculator take off',market:'market sections'
  };
  function findPage(text){
    const t=' '+normalize(text)+' ';
    let best=null,len=0;
    for(const [route,list] of Object.entries(PAGE_ALIASES)){
      const names=[pageName(route),...list.split(' ')];
      for(const n of names){const k=normalize(n);if(k.length>2&&t.includes(' '+k)&&k.length>len){best=route;len=k.length;}}
    }
    return best;
  }

  /* ------------------------------------------------------------------
     Conversation brain
     ------------------------------------------------------------------ */
  let lastTopic=null, lastRelated=[];
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const OPEN={
    how:['Sure! 👍 Here’s how:','No problem! 😊 Follow these steps:','Happy to help 🙌 Here’s how to do it:'],
    why:['Good catch! 🔍 Here’s what’s going on:','Let’s figure it out 🩺','Here’s why 💡'],
    what:['Great question! 💡','Here’s what you need to know ✨','Happy to explain 🙌'],
    how_ar:['أكيد! 👍 هاي الخطوات:','ولا يهمك 🙌 هيك بتعملها:'],
    why_ar:['خلينا نشوف السبب 🔍','هاي الأسباب المحتملة 🩺'],
    what_ar:['سؤال ممتاز! 💡','تفضل ✨ هاي المعلومات:']
  };
  function opener(question,ar){
    const q=normalize(question);
    const kind=/^(why|ليش|لماذا|ليه)|\b(why|error|cannot|cant|empty|missing|not working)\b|(ليش|مشكله|خطا|فاضي)/.test(q)?'why'
      :/^(how|كيف|شلون)|\b(how do|how to|steps)\b|(كيف|خطوات)/.test(q)?'how':'what';
    return pick(OPEN[kind+(ar?'_ar':'')]);
  }
  const AR_NOTE='\n\n*ℹ️ أسماء الأزرار مكتوبة بالإنجليزي متل ما بتظهر على الشاشة.*';

  function capabilities(ar){
    return ar
      ?'🤖 أنا **مساعد AMBS** — بعرف كل شي عن هذا النظام!\n\nبقدر:\n- 📘 أشرح أي شاشة أو زر خطوة بخطوة\n- 🧭 أفتحلك أي صفحة — اكتب مثلاً *افتح الإعدادات*\n- 🔢 أحكيلك أرقامك — مثلاً *كم منتج عندي؟*\n- 🩺 أكتشف ليش شي مش شغال — مثلاً *ليش قائمة المواقع فاضية؟*\n\nاسألني أي شي 😊'
      :'🤖 I’m the **AMBS Assistant** — I know this whole system inside out!\n\nI can:\n- 📘 Explain any page, form or button step by step\n- 🧭 Open pages for you — try *open settings*\n- 🔢 Tell you your numbers — try *how many products do I have?*\n- 🩺 Figure out why something isn’t working — try *why is the location list empty?*\n\nJust ask! 😊';
  }

  async function answer(question){
    const ar=isArabic(question), q=normalize(question), wc=q.split(' ').filter(Boolean).length;
    await loadGuide();

    // Small talk
    if(wc<=4&&/^(hi|hello|hey|hii+|yo|good (morning|evening|afternoon)|salam|السلام|مرحبا|اهلا|هلا|هاي|صباح|مسا)/.test(q))
      return {text:(ar?'👋 أهلاً وسهلاً! أنا مساعد AMBS.\n\n':'👋 Hi there! ')+capabilities(ar).replace(/^🤖[^\n]*\n\n/,''),chips:SUGGESTIONS.slice(0,4)};
    if(/^(thanks|thank you|thx|ty|great|perfect|awesome|nice|cool|ok thanks|شكرا|يسلمو|مشكور|يعطيك|تسلم)/.test(q))
      return {text:ar?'😊 العفو! إذا احتجت أي شي ثاني أنا هون 👋':'😊 You’re welcome! I’m here whenever you need help 👋'};
    if(/(what can you do|who are you|what are you|^help$|^help me$|^مساعده$|شو بتقدر|مين انت|ايش تقدر)/.test(q))
      return {text:capabilities(ar),chips:SUGGESTIONS.slice(0,4)};

    // Navigation: "open settings", "افتح المشتريات"
    const nav=q.match(/^(open|go to|goto|take me to|navigate to|show me|show|bring me to|افتح|روح|روح على|خذني|وديني|اعرض|افتحلي)\s+(.+)$/);
    if(nav){
      const route=findPage(nav[2]);
      if(route&&typeof App!=='undefined'){
        App.go(route);
        const sec=search(pageName(route)+' page')[0]?.s;
        if(sec)lastTopic=sec.id;
        return {text:(ar?`✅ فتحتلك صفحة **${pageName(route)}**.`:`✅ Opened **${pageName(route)}** for you.`)+
          (sec?(ar?`\n\nبدك أشرحلك كيف تستخدمها؟ 👇`:`\n\nWant a quick tour of this page? 👇`):''),chips:sec?[sec.title]:[]};
      }
    }

    // Counts: "how many products", "كم منتج"
    if(/(how many|how much|number of|count of|total|كم|عدد)/.test(q)){const c=countAnswer(question,ar);if(c)return {text:c};}
    if(/(my|list|show|which).*(locations|warehouses|sites)|(مواقعي|المواقع عندي|شو المواقع)/.test(q)){const c=countAnswer('locations',ar);if(c)return {text:c};}

    // Page help: "this page", "where am I"
    if(/(this page|this screen|current page|where am i|what is this|هاي الصفحه|هذه الصفحه|هاد الشاشه|وين انا)/.test(q)&&typeof App!=='undefined'){
      const sec=search(pageName(App.route)+' '+App.route)[0]?.s;
      if(sec)return reply(sec,question,ar,(ar?`📌 أنت الآن في **${pageName(App.route)}**.\n\n`:`📌 You’re on **${pageName(App.route)}**.\n\n`));
    }

    // Follow-ups: "more", "and then?", "next"
    if(wc<=3&&/^(more|next|and then|then|what next|continue|go on|tell me more|yes|yeah|sure|ok|okay|كمان|بعدين|وبعدين|كمل|اه|نعم|ايوه|تمام)$/.test(q)&&lastRelated.length){
      const sec=sections.find(s=>s.title===lastRelated[0]);
      if(sec)return reply(sec,question,ar,ar?'👉 كمان موضوع مرتبط:\n\n':'👉 Here’s a related topic:\n\n');
    }

    // Guide search
    const followUp=wc<=5&&/(it|that|this|there|them|هاد|هذا|هيك)/.test(q);
    const results=search(question,{boost:followUp?lastTopic:null});
    if(!results.length||results[0].score<4){
      const close=results.slice(0,3).map(r=>r.s.title);
      return {text:ar?'🤔 ما فهمت سؤالك تماماً. جرب تكتبه بطريقة ثانية، أو اختار موضوع من هون 👇':'🤔 I’m not sure I understood that. Try rephrasing it, or pick one of these topics 👇',
        chips:close.length?close:SUGGESTIONS.slice(0,4)};
    }
    const [top,second]=results;
    if(second&&second.score>top.score*.9&&top.score<12)
      return {text:ar?'🤔 عندي كم موضوع ممكن يكون قصدك — أي واحد؟ 👇':'🤔 I found a few topics that could match — which one did you mean? 👇',
        chips:results.slice(0,4).map(r=>r.s.title)};
    return reply(top.s,question,ar,'',results);
  }

  function reply(sec,question,ar,prefix='',results=null){
    lastTopic=sec.id;
    const related=(results||search(sec.title+' '+sec.keywords)).map(r=>r.s).filter(s=>s.id!==sec.id).slice(0,3).map(s=>s.title);
    lastRelated=related;
    const concepts=new Set([...tokens(question),...sec.t].filter(w=>w.startsWith('§')));
    const go=sec.routes.length&&!/#\//.test(sec.body)?`\n\n👉 Go to [${pageName(sec.routes[0])}](#/${sec.routes[0]})`:'';
    const text=prefix+(prefix?'':opener(question,ar)+'\n\n')+`📘 **${sec.title}**\n\n${sec.body}`+go+diagnose(concepts,ar)+(ar?AR_NOTE:'');
    return {text,chips:related};
  }

  /* ------------------------------------------------------------------
     Safe mini-markdown
     ------------------------------------------------------------------ */
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function inline(text){
    const link=route=>`<a href="#/${route}" class="as-link" data-route="${route}">${esc(pageName(route))} ↗</a>`;
    return esc(text)
      .replace(/`#\/([a-z0-9-]+)`/gi,(m,route)=>link(route))
      .replace(/`([^`]+)`/g,'<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g,'$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\(#\/([a-z0-9-]+)\)/gi,(m,label,route)=>`<a href="#/${route}" class="as-link" data-route="${route}">${label} ↗</a>`)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'$1')
      .replace(/(^|[\s(])#\/([a-z0-9-]+)/gi,(m,pre,route)=>pre+link(route));
  }
  function markdown(src){
    const lines=String(src).replace(/\r/g,'').split('\n'); let html='', list=null;
    const close=()=>{if(list){html+=`</${list}>`;list=null;}};
    for(const raw of lines){
      const line=raw.trimEnd(); let m;
      if(!line.trim()){close();continue;}
      if((m=line.match(/^\s*#{1,6}\s+(.*)$/))){close();html+=`<p class="as-h" dir="auto">${inline(m[1])}</p>`;continue;}
      if((m=line.match(/^\s*(\d+)[.)]\s+(.*)$/))){if(list!=='ol'){close();html+='<ol dir="auto">';list='ol';}html+=`<li dir="auto">${inline(m[2])}</li>`;continue;}
      if((m=line.match(/^\s*[-*•]\s+(.*)$/))){if(list!=='ul'){close();html+='<ul dir="auto">';list='ul';}html+=`<li dir="auto">${inline(m[1])}</li>`;continue;}
      if(/^\s*(---|\*\*\*)\s*$/.test(line)){close();html+='<hr>';continue;}
      close();html+=`<p dir="auto">${inline(line)}</p>`;
    }
    close();return html;
  }

  /* ------------------------------------------------------------------
     UI
     ------------------------------------------------------------------ */
  let messages=load(), busy=false, els={};
  function load(){try{const v=JSON.parse(localStorage.getItem(STORE_KEY)||'[]');return Array.isArray(v)?v.slice(-40):[];}catch{return [];}}
  function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(messages.slice(-40)));}catch{}}
  const WELCOME="👋 Hi! I’m the **AMBS Assistant** — I know every page, button and form in this system.\n\nAsk me anything — in English or عربي — about materials 📦, purchasing 🛒, production 🏭, stock 📊, dispatch 🚚 or settings ⚙️. I can also open pages for you 🧭 and check your data 🔍.";

  function build(){
    const fab=document.createElement('button');
    fab.type='button';fab.className='as-fab';fab.setAttribute('aria-label','Open AMBS Assistant');fab.setAttribute('aria-expanded','false');
    fab.innerHTML=`<span class="as-fab-icon" aria-hidden="true">💬</span><span class="as-fab-label">Ask AMBS</span>`;
    const panel=document.createElement('section');
    panel.className='as-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','AMBS Assistant');panel.hidden=true;
    panel.innerHTML=`
      <header class="as-head">
        <div class="as-avatar" aria-hidden="true">🤖</div>
        <div class="as-title"><b>AMBS Assistant</b><span class="as-status"><i></i><em>Online · ready to help</em></span></div>
        <button type="button" class="as-icon" data-act="clear" title="New conversation" aria-label="New conversation">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 11a8 8 0 10-2 5m2 3v-5h-5"/></svg></button>
        <button type="button" class="as-icon" data-act="close" title="Close" aria-label="Close assistant">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </header>
      <div class="as-log" role="log" aria-live="polite"></div>
      <form class="as-form">
        <textarea rows="1" maxlength="500" placeholder="Ask anything about AMBS… ✍️" aria-label="Your question" dir="auto"></textarea>
        <button type="submit" class="as-send" aria-label="Send">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>
      </form>
      <div class="as-foot">🔒 Built into AMBS · works offline · nothing leaves your browser</div>`;
    document.body.append(fab,panel);
    els={fab,panel,log:panel.querySelector('.as-log'),form:panel.querySelector('form'),input:panel.querySelector('textarea'),
      send:panel.querySelector('.as-send'),status:panel.querySelector('.as-status em')};
    fab.addEventListener('click',()=>toggle(panel.hidden));
    panel.addEventListener('click',e=>{
      const act=e.target.closest('[data-act]')?.dataset.act;
      if(act==='close')toggle(false);
      if(act==='clear')reset();
      const chip=e.target.closest('.as-chip');
      if(chip)ask(chip.dataset.q);
      const link=e.target.closest('.as-link');
      if(link){e.preventDefault();if(typeof App!=='undefined')App.go(link.dataset.route);if(innerWidth<720)toggle(false);}
    });
    els.form.addEventListener('submit',e=>{e.preventDefault();ask(els.input.value);});
    els.input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();ask(els.input.value);}});
    els.input.addEventListener('input',grow);
    panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();toggle(false);}});
    render();
  }
  function grow(){els.input.style.height='auto';els.input.style.height=Math.min(120,els.input.scrollHeight)+'px';}
  function toggle(open){
    els.panel.hidden=!open;els.fab.setAttribute('aria-expanded',String(open));
    document.body.classList.toggle('as-open',open);
    if(open)requestAnimationFrame(()=>{els.panel.classList.add('in');els.input.focus();scroll();});
    else{els.panel.classList.remove('in');els.fab.focus({preventScroll:true});}
  }
  function bubble(role,html){
    const el=document.createElement('div');
    el.className=`as-msg ${role}`;if(role==='user')el.setAttribute('dir','auto');el.innerHTML=html;els.log.append(el);return el;
  }
  function chipRow(list){
    if(!list?.length)return;
    const row=document.createElement('div');row.className='as-chips';
    row.innerHTML=list.map(q=>`<button type="button" class="as-chip" data-q="${esc(q)}">${esc(q)}</button>`).join('');
    els.log.append(row);
  }
  function render(){
    els.log.innerHTML='';
    bubble('assistant',markdown(WELCOME));
    if(!messages.length)chipRow(SUGGESTIONS);
    for(const m of messages)bubble(m.role,m.role==='user'?`<p>${esc(m.content)}</p>`:markdown(m.content));
    const last=messages[messages.length-1];
    if(last?.chips)chipRow(last.chips);
    scroll();
  }
  function scroll(){els.log.scrollTop=els.log.scrollHeight;}
  function reset(){messages=[];lastTopic=null;lastRelated=[];save();render();els.input.focus();}
  const wait=ms=>new Promise(r=>setTimeout(r,ms));

  async function ask(text){
    const question=String(text||'').trim().slice(0,500);
    if(!question||busy)return;
    busy=true;els.send.disabled=true;els.input.value='';grow();
    els.log.querySelectorAll('.as-chips').forEach(c=>c.remove());
    messages.push({role:'user',content:question});
    bubble('user',`<p>${esc(question)}</p>`);
    const out=bubble('assistant','<div class="as-typing"><i></i><i></i><i></i></div>');
    out.classList.add('pending');scroll();els.status.textContent='Typing…';
    let result;
    try{[result]=await Promise.all([answer(question),wait(550)]);}
    catch{result={text:'⚠️ I couldn’t load my knowledge base. Check your connection and try again.'};}
    out.classList.remove('pending');
    // Type the answer out progressively.
    const full=result.text, step=Math.max(6,Math.ceil(full.length/45));
    // Follow the text while it fits; once it is taller than the chat, keep the start of the answer in view.
    const follow=()=>{els.log.scrollTop=Math.min(els.log.scrollHeight,out.offsetTop-12);};
    for(let i=step;i<full.length;i+=step){out.innerHTML=markdown(full.slice(0,i));follow();await wait(14);}
    out.innerHTML=markdown(full);follow();
    messages.push({role:'assistant',content:full,chips:result.chips||[]});save();
    chipRow(result.chips);
    busy=false;els.send.disabled=false;els.status.textContent='Online · ready to help';
    follow();els.input.focus({preventScroll:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
