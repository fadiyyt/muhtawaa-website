(function (root, factory) {
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else { root.MuhtawaaBatch4Tools=root.MuhtawaaBatch4Tools||{}; for(const slug of Object.keys(api.tools)) root.MuhtawaaBatch4Tools[slug]=api; }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const DAY=86400000;
  const HIJRI_DATA='/data/ummalqura-1356-1500.json';
  const HIJRI_MONTHS=['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
  const tools={
    'date-offset-calculator':{title:'إضافة أو طرح أيام من تاريخ',hint:'الحساب بأيام ميلادية تقويمية متتابعة، ولا يستثني نهايات الأسبوع أو الإجازات.',fields:[{id:'date',label:'التاريخ الميلادي',type:'date'},{id:'days',label:'عدد الأيام الصحيحة',type:'number',min:0,step:1,value:0},{id:'operation',label:'العملية',type:'select',options:[['add','إضافة أيام'],['subtract','طرح أيام']]}]},
    'business-days-calculator':{title:'حاسبة أيام العمل بين تاريخين',hint:'العدّ شامل ليومي البداية والنهاية. لا تخصم الأداة الإجازات الرسمية أو أيامًا أخرى غير العطلة المختارة.',fields:[{id:'start',label:'تاريخ البداية',type:'date'},{id:'end',label:'تاريخ النهاية',type:'date'},{id:'weekend',label:'يومي عطلة نهاية الأسبوع',type:'select',options:[['fri-sat','الجمعة والسبت'],['sat-sun','السبت والأحد']]}]},
    'iso-week-calculator':{title:'رقم الأسبوع وفق ISO 8601',hint:'يبدأ أسبوع ISO يوم الاثنين؛ الأسبوع الأول هو الأسبوع الذي يحتوي 4 يناير، وقد تختلف سنة الأسبوع عن سنة التاريخ.',fields:[{id:'date',label:'التاريخ الميلادي',type:'date'}]},
    'date-countdown':{title:'العد التنازلي إلى تاريخ',hint:'إن تركت تاريخ المقارنة فارغًا، تستخدم الأداة التاريخ المحلي على جهازك. الحساب بالأيام المدنية ولا يقيس الساعات.',fields:[{id:'target',label:'التاريخ المستهدف',type:'date'},{id:'reference',label:'تاريخ المقارنة (اختياري)',type:'date',required:false}]},
    'hijri-days-difference':{title:'فرق الأيام بين تاريخين هجريين',hint:'يعتمد على جدول أم القرى المحلي من 1 محرم 1356 إلى 30 ذو الحجة 1500 هـ؛ كل تاريخ غير موجود أو خارج الحدود مرفوض.',fields:[{id:'day1',label:'اليوم الهجري الأول',type:'number',min:1,max:30,step:1},{id:'month1',label:'الشهر الهجري الأول',type:'select',options:HIJRI_MONTHS.map((n,i)=>[String(i+1),n])},{id:'year1',label:'السنة الهجرية الأولى (1356–1500)',type:'number',min:1356,max:1500,step:1},{id:'day2',label:'اليوم الهجري الثاني',type:'number',min:1,max:30,step:1},{id:'month2',label:'الشهر الهجري الثاني',type:'select',options:HIJRI_MONTHS.map((n,i)=>[String(i+1),n])},{id:'year2',label:'السنة الهجرية الثانية (1356–1500)',type:'number',min:1356,max:1500,step:1}]}
  };
  function parseDate(value){
    const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));if(!m)return null;
    const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);const date=new Date(0);date.setUTCHours(0,0,0,0);date.setUTCFullYear(y,mo-1,d);
    return date.getUTCFullYear()===y&&date.getUTCMonth()===mo-1&&date.getUTCDate()===d?date:null;
  }
  function iso(date){return `${String(date.getUTCFullYear()).padStart(4,'0')}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;}
  function addDays(value,days,operation='add'){
    const date=parseDate(value);if(!date)throw new Error('أدخل تاريخًا ميلاديًا صالحًا.');
    const n=Number(days);if(!Number.isInteger(n)||n<0)throw new Error('أدخل عدد أيام صحيحًا غير سالب.');
    if(!['add','subtract'].includes(operation))throw new Error('اختر إضافة أو طرح.');
    const result=new Date(date.getTime()+(operation==='add'?1:-1)*n*DAY);
    if(!Number.isFinite(result.getTime())||result.getUTCFullYear()<1||result.getUTCFullYear()>9999)throw new Error('التاريخ الناتج خارج النطاق المقبول.');
    return {date:iso(result),weekday:new Intl.DateTimeFormat('ar-SA',{weekday:'long',timeZone:'UTC'}).format(result)};
  }
  function businessDays(startValue,endValue,weekend='fri-sat'){
    const start=parseDate(startValue),end=parseDate(endValue);if(!start||!end)throw new Error('أدخل تاريخي بداية ونهاية صالحين.');
    if(start>end)throw new Error('يجب ألا تسبق البداية تاريخ النهاية.');
    const days=Math.round((end-start)/DAY)+1, fullWeeks=Math.floor(days/7), remainder=days%7;
    const off=weekend==='fri-sat'?[5,6]:weekend==='sat-sun'?[6,0]:null;if(!off)throw new Error('اختر نمط عطلة نهاية أسبوع صالحًا.');
    let offCount=fullWeeks*2;const weekday=start.getUTCDay();for(let i=0;i<remainder;i++)if(off.includes((weekday+i)%7))offCount++;
    return {business:days-offCount,weekend:offCount,total:days,weekendName:weekend==='fri-sat'?'الجمعة والسبت':'السبت والأحد'};
  }
  function isoWeek(value){
    const date=parseDate(value);if(!date)throw new Error('أدخل تاريخًا ميلاديًا صالحًا.');
    const weekday=(date.getUTCDay()+6)%7;
    const thursday=new Date(date.getTime()+(3-weekday)*DAY),year=thursday.getUTCFullYear();
    const jan4=new Date(0);jan4.setUTCHours(0,0,0,0);jan4.setUTCFullYear(year,0,4);
    const monday1=new Date(jan4.getTime()-((jan4.getUTCDay()+6)%7)*DAY);
    const week=Math.floor((date.getTime()-monday1.getTime())/(7*DAY))+1;
    const monday=new Date(date.getTime()-weekday*DAY),sunday=new Date(monday.getTime()+6*DAY);
    return {week,weekYear:year,monday:iso(monday),sunday:iso(sunday)};
  }
  function localToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function countdown(targetValue,referenceValue=''){
    const target=parseDate(targetValue),reference=parseDate(referenceValue||localToday());if(!target||!reference)throw new Error('أدخل تاريخًا مستهدفًا وتاريخ مقارنة صالحين.');
    const delta=Math.round((target-reference)/DAY);
    return {days:Math.abs(delta),signed:delta,state:delta>0?'متبقٍ':delta<0?'منقضٍ':'اليوم',reference:iso(reference),target:iso(target)};
  }
  function buildHijriIndex(payload){
    if(!payload||payload.calendar!=='islamic-umalqura'||!Array.isArray(payload.hijriDateByGregorianDay)||payload.hijriDateByGregorianDay.length!==payload.dayCount||payload.hijriDateByGregorianDay[0]!==13560101||payload.hijriDateByGregorianDay[payload.dayCount-1]!==15001230)throw new Error('جدول أم القرى المحلي غير صالح أو حدوده غير مطابقة.');
    const map=new Map();for(let i=0;i<payload.hijriDateByGregorianDay.length;i++)map.set(payload.hijriDateByGregorianDay[i],i);
    const start=parseDate(payload.gregorianStart);if(!start)throw new Error('بداية جدول أم القرى غير صالحة.');
    return {payload,start,map};
  }
  function hijriCode(day,month,year){return Number(year)*10000+Number(month)*100+Number(day);}
  function hijriDateIndex(day,month,year,data){
    if(![day,month,year].every(Number.isInteger)||year<1356||year>1500||month<1||month>12||day<1||day>30)return null;
    return data.map.has(hijriCode(day,month,year))?data.map.get(hijriCode(day,month,year)):null;
  }
  function gregorianForIndex(index,data){return iso(new Date(data.start.getTime()+index*DAY));}
  function hijriLabel(day,month,year){return `${day} ${HIJRI_MONTHS[month-1]} ${year} هـ`;}
  function hijriDifference(input,data){
    if(!data)throw new Error('تعذر قراءة جدول أم القرى المحلي.');
    const day1=Number(input.day1),month1=Number(input.month1),year1=Number(input.year1),day2=Number(input.day2),month2=Number(input.month2),year2=Number(input.year2);
    const first=hijriDateIndex(day1,month1,year1,data),second=hijriDateIndex(day2,month2,year2,data);
    if(first===null||second===null)throw new Error('أحد التاريخين غير موجود أو خارج النطاق المدعوم: 1356-01-01 إلى 1500-12-30 هـ.');
    const signed=second-first,absolute=Math.abs(signed),relation=signed<0?'قبل':signed>0?'بعد':'مطابق لـ';
    return {'التاريخ الأول':hijriLabel(day1,month1,year1),'التاريخ الثاني':hijriLabel(day2,month2,year2),'الفرق الموقّع':`${signed} يومًا (الثاني ${relation} الأول)`,'الفرق المطلق':`${absolute} يومًا`,'الأسابيع والأيام':`${Math.floor(absolute/7)} أسبوع و${absolute%7} يوم`,'المقابل الميلادي':`${gregorianForIndex(first,data)} إلى ${gregorianForIndex(second,data)}`};
  }
  function calculate(slug,input,data){
    if(slug==='date-offset-calculator'){const x=addDays(input.date,input.days,input.operation);return {'التاريخ الناتج':x.date,'يوم الأسبوع':x.weekday,'نوع العملية':input.operation==='add'?'إضافة':'طرح'};}
    if(slug==='business-days-calculator'){const x=businessDays(input.start,input.end,input.weekend);return {'أيام العمل':String(x.business),'أيام عطلة نهاية الأسبوع':String(x.weekend),'إجمالي الأيام الشامل للطرفين':String(x.total),'نمط العطلة':x.weekendName,'العطل الرسمية':'غير مستبعدة'};}
    if(slug==='iso-week-calculator'){const x=isoWeek(input.date);return {'رقم الأسبوع ISO':String(x.week),'سنة الأسبوع ISO':String(x.weekYear),'بداية الأسبوع (الاثنين)':x.monday,'نهاية الأسبوع (الأحد)':x.sunday};}
    if(slug==='date-countdown'){const x=countdown(input.target,input.reference);return {'الحالة':x.state,'عدد الأيام':String(x.days),'الفرق الموقّع':String(x.signed),'تاريخ المقارنة':x.reference,'التاريخ المستهدف':x.target};}
    if(slug==='hijri-days-difference')return hijriDifference(input,data);
    throw new Error('أداة التاريخ غير معروفة.');
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function markup(field){
    if(field.type==='select')return `<div class="form-field"><label for="${field.id}">${esc(field.label)}</label><select id="${field.id}" name="${field.id}" required>${field.options.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></div>`;
    return `<div class="form-field"><label for="${field.id}">${esc(field.label)}</label><input id="${field.id}" name="${field.id}" type="${field.type}" ${field.min!==undefined?`min="${field.min}"`:''} ${field.max!==undefined?`max="${field.max}"`:''} step="${field.step||'any'}" ${field.value!==undefined?`value="${field.value}"`:''} ${field.required===false?'':'required'}></div>`;
  }
  function renderForm(rootElement,config){
    rootElement.innerHTML=`<form class="tool-form"><div class="form-grid">${config.fields.map(markup).join('')}</div><p class="tool-note">${esc(config.hint)}</p><div class="action-row"><button class="button-primary" type="submit">${config.button||'احسب'}</button><button class="button-quiet" type="reset">مسح</button></div><div class="result-box" aria-live="polite"></div></form>`;
    const form=rootElement.querySelector('form'),box=rootElement.querySelector('.result-box');
    form.addEventListener('submit',async event=>{event.preventDefault();try{const input=Object.fromEntries(new FormData(form).entries());const data=config.hijri?await loadHijriData():null;const result=calculate(rootElement.dataset.tool,input,data);box.innerHTML=`<h3>نتيجة حساب الأيام</h3><dl>${Object.entries(result).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;box.classList.add('visible');box.classList.remove('error-message');}catch(error){box.textContent=error.message||'تعذر حساب التاريخ.';box.classList.add('visible','error-message');}});
    form.addEventListener('reset',()=>{box.replaceChildren();box.classList.remove('visible','error-message');});
  }
  let hijriPromise;
  function loadHijriData(){
    if(!hijriPromise)hijriPromise=fetch(HIJRI_DATA).then(response=>{if(!response.ok)throw new Error('تعذر تحميل جدول أم القرى المحلي.');return response.json();}).then(buildHijriIndex).catch(error=>{hijriPromise=null;throw error;});
    return hijriPromise;
  }
  function mount(rootElement){const config=tools[rootElement.dataset.tool];if(!config)return;config.hijri=rootElement.dataset.tool==='hijri-days-difference';renderForm(rootElement,config);}
  return {tools,calculate,parseDate,addDays,businessDays,isoWeek,countdown,buildHijriIndex,hijriDateIndex,hijriDifference,loadHijriData,mount};
});
