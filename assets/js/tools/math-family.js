(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.MuhtawaaBatch4Tools = root.MuhtawaaBatch4Tools || {};
    for (const slug of Object.keys(api.tools)) root.MuhtawaaBatch4Tools[slug] = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const tools = {
    'percentage-adjustment': {
      title: 'حاسبة زيادة أو نقصان النسبة', hint: 'النسبة محسوبة من القيمة الأصلية، ونتيجة النقصان لا تقل عن الصفر.',
      fields: [{id:'base',label:'القيمة الأصلية',type:'number',min:0,step:'any',value:100},{id:'percent',label:'النسبة المئوية',type:'number',min:0,max:100,step:'any',value:10},{id:'operation',label:'نوع العملية',type:'select',options:[['increase','زيادة'],['decrease','نقصان']]}]
    },
    'percent-of-number': {
      title: 'حاسبة نسبة من رقم', hint: 'تعرض الحاسبة قيمة النسبة والجزء المتبقي من الرقم الأساسي؛ يمكن إدخال نسبة أكبر من 100%.',
      fields: [{id:'base',label:'الرقم الأساسي',type:'number',step:'any',value:200},{id:'percent',label:'النسبة المئوية المطلوبة',type:'number',step:'any',value:15}]
    },
    'percentage-difference': {
      title: 'حاسبة الفرق النسبي بين رقمين', hint: 'تستخدم الأداة الفرق المتماثل المقسوم على متوسط المقدارين المطلقين، لا أحد الرقمين أساسًا وحيدًا.',
      fields: [{id:'first',label:'الرقم الأول',type:'number',step:'any',value:100},{id:'second',label:'الرقم الثاني',type:'number',step:'any',value:120}]
    },
    'average-calculator': {
      title: 'حاسبة المتوسط والوسيط', hint: 'أدخل من 1 إلى 500 قيمة مفصولة بفاصلة أو سطر جديد؛ تُقبل الإشارة والكسور العشرية.',
      fields: [{id:'values',label:'قائمة الأرقام',type:'textarea',placeholder:'12, 15.5, 18'}]
    },
    'ratio-proportion-calculator': {
      title: 'حل التناسب a:b = c:x', hint: 'أدخل القيم الثلاث المعروفة؛ المطلوب هو x في التناسب a:b = c:x، ويجب أن تكون a غير صفرية.',
      fields: [{id:'a',label:'القيمة a في النسبة a:b',type:'number',step:'any',value:2},{id:'b',label:'القيمة b في النسبة a:b',type:'number',step:'any',value:3},{id:'c',label:'القيمة c في النسبة c:x',type:'number',step:'any',value:10}]
    },
    'gcd-lcm-calculator': {
      title: 'حاسبة القاسم والمضاعف المشترك', hint: 'اكتب من 2 إلى 20 عددًا صحيحًا؛ تعمل الأداة مع الأعداد السالبة والصفر باستخدام BigInt.',
      fields: [{id:'values',label:'الأعداد الصحيحة',type:'textarea',placeholder:'12, 18'}]
    },
    'simple-interest-calculator': {
      title: 'تقدير الفائدة البسيطة', hint: 'هذا تطبيق حسابي للفائدة البسيطة على سنة اصطلاحية من 365 يومًا، وليس توصية أو عرضًا ماليًا.',
      fields: [{id:'principal',label:'أصل المبلغ',type:'number',min:0,step:'any',value:10000},{id:'rate',label:'المعدل السنوي %',type:'number',min:0,max:1000,step:'any',value:5},{id:'days',label:'المدة بالأيام',type:'number',min:0,step:1,value:365}]
    },
    'compound-interest-calculator': {
      title: 'تقدير الفائدة المركبة', hint: 'تطبق المعادلة على مبلغ واحد بلا إيداعات أو سحوبات دورية؛ النتائج افتراضية ولا تشمل الرسوم أو الضرائب.',
      fields: [{id:'principal',label:'أصل المبلغ',type:'number',min:0,step:'any',value:10000},{id:'rate',label:'المعدل السنوي الاسمي %',type:'number',min:0,max:100,step:'any',value:5},{id:'periods',label:'مرات الرسملة في السنة',type:'select',options:[['1','سنوية (1)'],['2','نصف سنوية (2)'],['4','ربع سنوية (4)'],['12','شهرية (12)']]},{id:'years',label:'المدة بالسنوات',type:'number',min:0,max:100,step:'any',value:10}]
    }
  };

  function finite(input, key, label) {
    const value = Number(input[key]);
    if (input[key] === '' || !Number.isFinite(value)) throw new Error(`أدخل ${label} بشكل صحيح.`);
    return value;
  }
  function fmt(value, digits=8) {
    if (!Number.isFinite(value)) throw new Error('الناتج تجاوز مجال الأرقام؛ خفّض القيمة أو المدة.');
    return new Intl.NumberFormat('ar-SA',{maximumFractionDigits:digits}).format(value);
  }
  function normalizeDigits(text) {
    return String(text).replace(/[٠-٩۰-۹]/g, ch => {
      const n=ch.charCodeAt(0);
      return String(n >= 0x06f0 ? n-0x06f0 : n-0x0660);
    }).replace(/٫/g,'.').replace(/−/g,'-');
  }
  function parseValues(text, limit=500) {
    const parts=normalizeDigits(text).trim().split(/[\s,،;؛]+/u).filter(Boolean);
    if (!parts.length || parts.length>limit) throw new Error(`أدخل قائمة من 1 إلى ${limit} قيمة.`);
    const values=parts.map(Number);
    if (values.some(v=>!Number.isFinite(v))) throw new Error('تحتوي القائمة على قيمة غير رقمية. افصل الأرقام بفاصلة أو سطر جديد.');
    return values;
  }
  function gcdBigInt(a,b) {
    a=a<0n?-a:a; b=b<0n?-b:b;
    while (b) [a,b]=[b,a%b];
    return a;
  }
  function gcdLcm(values) {
    const normalized=normalizeDigits(values);
    const parts=normalized.trim().split(/[\s,،;؛]+/u).filter(Boolean);
    if (parts.length<2 || parts.length>20) throw new Error('أدخل من عددين إلى 20 عددًا صحيحًا.');
    if (parts.some(part=>!/^[-+]?\d+$/.test(part))) throw new Error('يجب أن تكون كل القيم أعدادًا صحيحة دون كسور.');
    const numbers=parts.map(BigInt);
    let gcd=0n, lcm=1n;
    for (const n of numbers) {
      gcd=gcdBigInt(gcd,n);
      if (n===0n || lcm===0n) lcm=0n;
      else lcm=(lcm/gcdBigInt(lcm,n))*n;
      if (lcm<0n) lcm=-lcm;
    }
    return {'القاسم المشترك الأكبر':gcd.toString(),'المضاعف المشترك الأصغر':lcm.toString(),'عدد القيم':String(numbers.length)};
  }
  function calculate(slug,input) {
    if (!tools[slug]) throw new Error('الحاسبة غير معروفة.');
    if (slug==='percentage-adjustment') {
      const base=finite(input,'base','القيمة الأصلية'), rate=finite(input,'percent','النسبة');
      if (base<0 || rate<0 || rate>100) throw new Error('أدخل قيمة أصلية غير سالبة ونسبة بين 0 و100.');
      if (!['increase','decrease'].includes(input.operation)) throw new Error('اختر زيادة أو نقصان.');
      const delta=base*rate/100, total=base+(input.operation==='increase'?delta:-delta);
      return {'مقدار التغير':fmt(delta),'القيمة بعد العملية':fmt(total),'المعادلة':`${fmt(base)} ${input.operation==='increase'?'+':'−'} ${fmt(delta)} = ${fmt(total)}`};
    }
    if (slug==='percent-of-number') {
      const base=finite(input,'base','الرقم الأساسي'), rate=finite(input,'percent','النسبة');
      if (rate<0) throw new Error('أدخل نسبة مئوية غير سالبة.');
      const part=base*rate/100;
      return {'النسبة من الرقم':fmt(part),'الباقي بعد طرحها':fmt(base-part),'العملية':`${fmt(base)} × ${fmt(rate)} ÷ 100`};
    }
    if (slug==='percentage-difference') {
      const a=finite(input,'first','الرقم الأول'), b=finite(input,'second','الرقم الثاني');
      const difference=Math.abs(a-b), mean=(Math.abs(a)+Math.abs(b))/2;
      if (mean===0) throw new Error('الفرق النسبي غير معرّف عندما يكون الرقمان صفرًا؛ الفرق المطلق يساوي صفرًا.');
      return {'الفرق المطلق':fmt(difference),'متوسط المقدارين':fmt(mean),'الفرق النسبي':`${fmt(difference/mean*100)}%`};
    }
    if (slug==='average-calculator') {
      const values=parseValues(input.values,500), sorted=[...values].sort((a,b)=>a-b), sum=values.reduce((a,b)=>a+b,0), n=values.length;
      const median=n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2;
      return {'المتوسط الحسابي':fmt(sum/n),'الوسيط':fmt(median),'أصغر قيمة':fmt(sorted[0]),'أكبر قيمة':fmt(sorted[n-1]),'عدد القيم':String(n),'المجموع':fmt(sum)};
    }
    if (slug==='ratio-proportion-calculator') {
      const a=finite(input,'a','القيمة a'), b=finite(input,'b','القيمة b'), c=finite(input,'c','القيمة c');
      if (a===0) throw new Error('لا يمكن إيجاد x عندما تكون a صفرًا؛ المقسوم عليه يجب أن يكون غير صفر.');
      const x=b*c/a;
      return {'القيمة المجهولة x':fmt(x),'التناسب الناتج':`${fmt(a)}:${fmt(b)} = ${fmt(c)}:${fmt(x)}`,'التحقق بالضرب التبادلي':`${fmt(a*x)} = ${fmt(b*c)}`};
    }
    if (slug==='gcd-lcm-calculator') return gcdLcm(input.values);
    if (slug==='simple-interest-calculator') {
      const p=finite(input,'principal','أصل المبلغ'), rate=finite(input,'rate','المعدل السنوي'), days=finite(input,'days','عدد الأيام');
      if (p<0 || rate<0 || !Number.isInteger(days) || days<0) throw new Error('أدخل أصلًا ومعدلًا غير سالبين ومدة أيام صحيحة غير سالبة.');
      if (rate>1000) throw new Error('أدخل معدلًا سنويًا لا يتجاوز 1000%.');
      const interest=p*(rate/100)*(days/365), total=p+interest;
      return {'الفائدة البسيطة التقديرية':fmt(interest),'الإجمالي بعد المدة':fmt(total),'المعدل للفترة':`${fmt(rate*days/365)}%`,'قاعدة المدة':'سنة حسابية ثابتة من 365 يومًا، دون رسملة.'};
    }
    if (slug==='compound-interest-calculator') {
      const p=finite(input,'principal','أصل المبلغ'), rate=finite(input,'rate','المعدل السنوي'), n=finite(input,'periods','مرات الرسملة'), years=finite(input,'years','المدة');
      if (p<0 || rate<0 || rate>100 || ![1,2,4,12].includes(n) || years<0 || years>100) throw new Error('أدخل أصلًا ومعدلًا صالحين، واختر رسملة 1 أو 2 أو 4 أو 12 مرة، ومدة حتى 100 سنة.');
      const annual=rate/100, total=p*Math.pow(1+annual/n,n*years), interest=total-p, effective=(Math.pow(1+annual/n,n)-1)*100;
      return {'القيمة المستقبلية التقديرية':fmt(total),'الفائدة المتراكمة':fmt(interest),'المعدل السنوي الفعلي':`${fmt(effective)}%`,'عدد مرات الرسملة الكلي':fmt(n*years,4)};
    }
    throw new Error('الحاسبة غير معروفة.');
  }
  function esc(value) { return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function markup(field) {
    if (field.type==='select') return `<div class="form-field"><label for="${field.id}">${esc(field.label)}</label><select id="${field.id}" name="${field.id}" required>${field.options.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></div>`;
    if (field.type==='textarea') return `<div class="form-field"><label for="${field.id}">${esc(field.label)}</label><textarea id="${field.id}" name="${field.id}" rows="4" placeholder="${esc(field.placeholder||'')}" required></textarea></div>`;
    return `<div class="form-field"><label for="${field.id}">${esc(field.label)}</label><input id="${field.id}" name="${field.id}" type="number" min="${field.min??''}" max="${field.max??''}" step="${field.step||'any'}" value="${field.value??''}" required></div>`;
  }
  function mount(rootElement) {
    const slug=rootElement.dataset.tool, config=tools[slug]; if(!config)return;
    const buttonLabel=slug==='gcd-lcm-calculator'?'احسب القاسم والمضاعف':slug==='average-calculator'?'احسب الإحصاءات':slug==='ratio-proportion-calculator'?'أوجد x':slug==='simple-interest-calculator'?'قدّر الفائدة البسيطة':slug==='compound-interest-calculator'?'قدّر النمو المركب':'احسب النتيجة';
    rootElement.innerHTML=`<form class="tool-form"><div class="form-grid">${config.fields.map(markup).join('')}</div><p class="tool-note">${esc(config.hint)}</p><div class="action-row"><button class="button-primary" type="submit">${buttonLabel}</button><button class="button-quiet" type="reset">مسح</button></div><div class="result-box" aria-live="polite"></div></form>`;
    const form=rootElement.querySelector('form'), box=rootElement.querySelector('.result-box');
    form.addEventListener('submit',event=>{event.preventDefault();try{const result=calculate(slug,Object.fromEntries(new FormData(form).entries()));box.innerHTML=`<h3>نتيجة الحساب</h3><dl>${Object.entries(result).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;box.classList.add('visible');box.classList.remove('error-message');}catch(error){box.textContent=error.message||'تعذر إجراء الحساب.';box.classList.add('visible','error-message');}});
    form.addEventListener('reset',()=>{box.replaceChildren();box.classList.remove('visible','error-message');});
  }
  return {tools,calculate,mount,normalizeDigits,parseValues,gcdLcm};
});
