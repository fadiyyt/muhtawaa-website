(function (root, factory) {
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else { root.MuhtawaaBatch4Tools=root.MuhtawaaBatch4Tools||{}; for(const slug of Object.keys(api.tools)) root.MuhtawaaBatch4Tools[slug]=api; }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const tools={
    'character-counter':{title:'عداد الأحرف والرموز المرئية',hint:'يقيس العناقيد المرئية ونقاط Unicode وبايتات UTF-8؛ قد تختلف هذه الأعداد عن حد الأحرف في تطبيق آخر.',fields:[{id:'text',label:'النص المراد قياسه',type:'textarea',placeholder:'اكتب أو ألصق النص هنا'},{id:'excludeWhitespace',label:'استثناء الفراغات من العدد الرئيسي',type:'checkbox',checked:false}]},
    'case-converter':{title:'محول حالة الأحرف',hint:'التحويل يؤثر في الأحرف التي لها حالة، مثل اللاتينية؛ الحروف العربية لا تملك حالة كبيرة وصغيرة.',fields:[{id:'text',label:'النص قبل التحويل',type:'textarea',placeholder:'Paste or type text'},{id:'mode',label:'الحالة المطلوبة',type:'select',options:[['upper','أحرف كبيرة'],['lower','أحرف صغيرة'],['title','حالة عنوانية'],['sentence','بداية كل جملة']]}]},
    'arabic-diacritics-remover':{title:'إزالة التشكيل العربي',hint:'تحذف الأداة الحركات العربية الأساسية والألف الخنجرية؛ يبقى التطويل ما لم تختَر إزالته.',fields:[{id:'text',label:'النص العربي أو المختلط',type:'textarea',placeholder:'اكتب نصًا مشكولًا أو ألصقه هنا'},{id:'removeTatweel',label:'إزالة التطويل ـ أيضًا',type:'checkbox',checked:false}]},
    'duplicate-spaces-remover':{title:'إزالة المسافات المكررة',hint:'تختصر المسافات الأفقية والتبويبات المتتابعة، وتحافظ على فواصل الأسطر والفقرات.',fields:[{id:'text',label:'النص المراد تنظيفه',type:'textarea',placeholder:'ألصق النص مع المسافات المراد معالجتها'},{id:'trimLines',label:'إزالة الفراغات من بداية ونهاية كل سطر',type:'checkbox',checked:false}]},
    'reverse-text':{title:'عكس ترتيب النص',hint:'يعكس ترتيب العناقيد المرئية؛ لا يجزّئ الحرف عن تشكيله أو الإيموجي المركب إلى وحدات مكسورة.',fields:[{id:'text',label:'النص المراد عكسه',type:'textarea',placeholder:'اكتب النص أو ألصقه'},{id:'mode',label:'نطاق العكس',type:'select',options:[['all','عكس كل النص كوحدة واحدة'],['lines','عكس ترتيب الأسطر فقط']]}]},
    'alphabetize-list':{title:'ترتيب قائمة أبجديًا',hint:'كل سطر عنصر مستقل؛ الترتيب يستخدم مقارنة تراعي لغة القائمة ولا تحذف العناصر المكررة.',fields:[{id:'text',label:'عنصر واحد في كل سطر',type:'textarea',placeholder:'موز\nتفاح\nبرتقال'},{id:'locale',label:'لغة الترتيب',type:'select',options:[['ar','العربية'],['en','الإنجليزية']]},{id:'direction',label:'اتجاه الترتيب',type:'select',options:[['asc','تصاعدي من أ إلى ي'],['desc','تنازلي من ي إلى أ']]},{id:'trimItems',label:'إزالة الفراغات من أطراف كل عنصر',type:'checkbox',checked:true}]},
    'text-compare':{title:'مقارنة نصين',hint:'تُظهر الأداة التطابق الحرفي والتطابق بعد إزالة الفراغات الطرفية، وتحدد أول عنقود مختلف.',fields:[{id:'first',label:'النص الأول',type:'textarea',placeholder:'الصق النسخة الأولى'},{id:'second',label:'النص الثاني',type:'textarea',placeholder:'الصق النسخة الثانية'},{id:'ignoreOuter',label:'تجاهل الفراغات الطرفية عند المقارنة الثانية',type:'checkbox',checked:true}]}
  };
  function segments(text,locale='ar'){
    if(typeof Intl!=='undefined'&&Intl.Segmenter){return [...new Intl.Segmenter(locale,{granularity:'grapheme'}).segment(String(text))].map(x=>x.segment);}
    return Array.from(String(text));
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function countText(input){
    const text=String(input.text??''), clusters=segments(text), nonWhitespace=clusters.filter(part=>!/^\s+$/u.test(part)).length;
    const codePoints=Array.from(text).length, bytes=new TextEncoder().encode(text).length;
    const spaces=(text.match(/\s/gu)||[]).length, lines=text.length?text.split(/\r\n|\r|\n/).length:0;
    const primary=input.excludeWhitespace==='true'||input.excludeWhitespace===true?nonWhitespace:clusters.length;
    return {'العدد الرئيسي':String(primary),'العناقيد المرئية مع الفراغات':String(clusters.length),'العناقيد بعد استثناء الفراغات':String(nonWhitespace),'نقاط Unicode':String(codePoints),'بايتات UTF-8':String(bytes),'محارف الفراغ البيضاء':String(spaces),'الأسطر':String(lines)};
  }
  function caseConvert(input){
    const text=String(input.text??''), mode=input.mode;
    let result;
    if(mode==='upper') result=text.toLocaleUpperCase('en');
    else if(mode==='lower') result=text.toLocaleLowerCase('en');
    else if(mode==='title') result=text.toLocaleLowerCase('en').replace(/(^|\s)(\p{L})/gu,(_,gap,letter)=>gap+letter.toLocaleUpperCase('en'));
    else if(mode==='sentence') result=text.toLocaleLowerCase('en').replace(/(^\s*|[.!?؟]\s+)(\p{L})/gu,(_,gap,letter)=>gap+letter.toLocaleUpperCase('en'));
    else throw new Error('اختر نوع تحويل معروفًا.');
    const before=segments(text),after=segments(result),changed=Array.from({length:Math.max(before.length,after.length)},(_,i)=>before[i]!==after[i]).filter(Boolean).length;
    return {'النص بعد التحويل':result,'مواضع العناقيد المختلفة بعد التحويل':String(changed),'عدد العناقيد قبل التحويل':String(before.length),'عدد العناقيد بعد التحويل':String(after.length),'ملاحظة':'قد يتغير عدد الأحرف عند تحويل بعض اللغات؛ الحروف العربية لا تتغير بهذا التحويل.'};
  }
  function stripDiacritics(input){
    const text=String(input.text??''), marks=/[\u064B-\u0652\u0670]/gu;
    const matches=text.match(marks)||[];
    let output=text.replace(marks,'');
    if(input.removeTatweel==='true'||input.removeTatweel===true) output=output.replace(/ـ/gu,'');
    return {'النص بعد إزالة التشكيل':output,'علامات التشكيل المحذوفة':String(matches.length),'التطويل المحذوف':String((input.removeTatweel==='true'||input.removeTatweel===true)?(text.match(/ـ/gu)||[]).length:0)};
  }
  function collapseSpaces(input){
    const text=String(input.text??''), horizontal=/[ \t\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]{2,}/gu;
    const nbspCount=(text.match(/\u00a0/gu)||[]).length, normalized=text.replace(/\u00a0/gu,' ');
    const before=(normalized.match(horizontal)||[]).length;
    let output=normalized.replace(horizontal,' ');
    if(input.trimLines==='true'||input.trimLines===true) output=output.split(/\r\n|\r|\n/).map(line=>line.trim()).join('\n');
    return {'النص المنظف':output,'مقاطع المسافات المكررة المختصرة':String(before),'مسافات غير قابلة للكسر حُولت':String(nbspCount),'الأسطر قبل التنظيف':String(text?text.split(/\r\n|\r|\n/).length:0),'الأسطر بعد التنظيف':String(output?output.split(/\r\n|\r|\n/).length:0)};
  }
  function reverseText(input){
    const text=String(input.text??''), list=segments(text);
    if(input.mode==='lines'){
      const lines=text.split(/\r\n|\r|\n/);
      return {'النص الناتج':lines.reverse().join('\n'),'عدد الأسطر المعكوسة':String(lines.length),'طريقة المعالجة':'انعكس ترتيب الأسطر؛ بقي ترتيب المحارف داخل كل سطر كما هو.'};
    }
    if(input.mode!=='all') throw new Error('اختر نطاقًا صالحًا للعكس.');
    return {'النص الناتج':list.reverse().join(''),'العناقيد قبل العكس':String(list.length),'طريقة المعالجة':'عُكس ترتيب العناقيد المرئية مع إبقاء مكونات كل عنقود متماسكة.'};
  }
  function sortList(input){
    let items=String(input.text??'').split(/\r\n|\r|\n/);
    if(input.trimItems==='true'||input.trimItems===true) items=items.map(x=>x.trim());
    items=items.filter(x=>x.length>0);
    const locale=input.locale==='en'?'en':'ar';
    if(!['asc','desc'].includes(input.direction)) throw new Error('اختر اتجاه ترتيب صالحًا.');
    const collator=new Intl.Collator(locale,{sensitivity:'base',numeric:true,ignorePunctuation:false});
    items.sort((a,b)=>collator.compare(a,b)*(input.direction==='desc'?-1:1));
    return {'القائمة المرتبة':items.join('\n'),'عدد العناصر المرتبة':String(items.length),'لغة المقارنة':locale==='ar'?'العربية':'الإنجليزية','العناصر المكررة':'تُحفظ ولا تُحذف.'};
  }
  function compareText(input){
    const first=String(input.first??''),second=String(input.second??''),a=segments(first),b=segments(second);
    let i=0; while(i<Math.min(a.length,b.length)&&a[i]===b[i]) i++;
    const exact=first===second, trimmed=first.trim()===second.trim();
    const ignore=input.ignoreOuter==='true'||input.ignoreOuter===true;
    const difference=i===a.length&&i===b.length?'لا يوجد':`${i<a.length?`الأول: «${a[i]}»`:'الأول: نهاية النص'}؛ ${i<b.length?`الثاني: «${b[i]}»`:'الثاني: نهاية النص'}`;
    return {'تطابق حرفي':exact?'نعم':'لا','تطابق بعد إزالة الفراغات الطرفية':trimmed?'نعم':'لا','النتيجة بحسب خيارك':(ignore?trimmed:exact)?'النصان متطابقان وفق المعيار المختار':'يوجد اختلاف بين النصين','طول النص الأول بالعناقيد':String(a.length),'طول النص الثاني بالعناقيد':String(b.length),'أول موضع اختلاف':i===a.length&&i===b.length?'لا يوجد':String(i+1),'العنقود الأول المختلف':difference};
  }
  function calculate(slug,input){
    if(slug==='character-counter')return countText(input);
    if(slug==='case-converter')return caseConvert(input);
    if(slug==='arabic-diacritics-remover')return stripDiacritics(input);
    if(slug==='duplicate-spaces-remover')return collapseSpaces(input);
    if(slug==='reverse-text')return reverseText(input);
    if(slug==='alphabetize-list')return sortList(input);
    if(slug==='text-compare')return compareText(input);
    throw new Error('أداة النصوص غير معروفة.');
  }
  function fieldMarkup(field){
    if(field.type==='select')return `<div class="form-field"><label for="${field.id}">${esc(field.label)}</label><select id="${field.id}" name="${field.id}" required>${field.options.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></div>`;
    if(field.type==='checkbox')return `<label class="check-row"><input id="${field.id}" name="${field.id}" type="checkbox" ${field.checked?'checked':''}> ${esc(field.label)}</label>`;
    return `<div class="form-field"><label for="${field.id}">${esc(field.label)}</label><textarea id="${field.id}" name="${field.id}" rows="5" placeholder="${esc(field.placeholder||'')}"></textarea></div>`;
  }
  function mount(rootElement){
    const slug=rootElement.dataset.tool,config=tools[slug];if(!config)return;
    const label=slug==='character-counter'?'حدّث العدد':slug==='case-converter'?'حوّل الحالة':slug==='arabic-diacritics-remover'?'أزل التشكيل':slug==='duplicate-spaces-remover'?'نظّف المسافات':slug==='reverse-text'?'اعكس النص':slug==='alphabetize-list'?'رتّب القائمة':'قارن النصين';
    rootElement.innerHTML=`<form class="tool-form">${config.fields.map(fieldMarkup).join('')}<p class="tool-note">${esc(config.hint)}</p><div class="action-row"><button class="button-primary" type="submit">${label}</button><button class="button-quiet" type="reset">مسح</button></div><div class="result-box" aria-live="polite"></div></form>`;
    const form=rootElement.querySelector('form'),box=rootElement.querySelector('.result-box');
    form.addEventListener('submit',event=>{event.preventDefault();try{const input=Object.fromEntries(new FormData(form).entries());for(const field of config.fields)if(field.type==='checkbox')input[field.id]=form.elements[field.id].checked?'true':'false';const result=calculate(slug,input);box.innerHTML=`<h3>النتيجة</h3><dl>${Object.entries(result).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;box.classList.add('visible');box.classList.remove('error-message');}catch(error){box.textContent=error.message||'تعذرت معالجة النص.';box.classList.add('visible','error-message');}});
    form.addEventListener('reset',()=>{box.replaceChildren();box.classList.remove('visible','error-message');});
  }
  return {tools,calculate,mount,segments};
});
