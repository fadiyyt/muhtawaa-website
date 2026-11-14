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
    'length-converter': { title: 'محول الطول', label: 'المسافة', units: [['mm','ملليمتر',.001],['cm','سنتيمتر',.01],['m','متر',1],['km','كيلومتر',1000],['in','بوصة',.0254],['ft','قدم',.3048],['yd','ياردة',.9144],['mi','ميل',1609.344]] },
    'weight-converter': { title: 'محول الكتلة', label: 'الكتلة', units: [['mg','ملليغرام',.000001],['g','غرام',.001],['kg','كيلوغرام',1],['t','طن متري',1000],['lb','رطل',.45359237],['oz','أونصة',.028349523125]] },
    'area-converter': { title: 'محول المساحة', label: 'المساحة', units: [['mm2','ملليمتر مربع',.000001],['cm2','سنتيمتر مربع',.0001],['m2','متر مربع',1],['ha','هكتار',10000],['km2','كيلومتر مربع',1000000],['acre','فدان أمريكي',4046.8564224],['ft2','قدم مربع',.09290304]] },
    'volume-converter': { title: 'محول الحجم والسعة', label: 'الحجم', units: [['ml','ملليلتر',.001],['l','لتر',1],['m3','متر مكعب',1000],['usgal','جالون أمريكي',3.785411784],['ukgal','جالون بريطاني',4.54609],['uscup','كوب أمريكي',.2365882365]] },
    'speed-converter': { title: 'محول السرعة', label: 'السرعة', units: [['mps','متر/ثانية',1],['kph','كيلومتر/ساعة',1/3.6],['mph','ميل/ساعة',.44704],['kn','عقدة بحرية',.514444444444],['fps','قدم/ثانية',.3048]] },
    'pressure-converter': { title: 'محول الضغط', label: 'الضغط', units: [['pa','باسكال',1],['kpa','كيلوباسكال',1000],['mpa','ميغاباسكال',1000000],['bar','بار',100000],['atm','ضغط جوي',101325],['psi','رطل/بوصة²',6894.757293168],['mmhg','ملليمتر زئبق',133.322387415]] },
    'energy-converter': { title: 'محول الطاقة', label: 'الطاقة', units: [['j','جول',1],['kj','كيلوجول',1000],['cal','سعر حراري صغير',4.184],['kcal','كيلو سعرة حرارية',4184],['wh','واط ساعة',3600],['kwh','كيلوواط ساعة',3600000],['btu','وحدة حرارية بريطانية',1055.05585262]] },
    'data-size-converter': { title: 'محول وحدات البيانات', label: 'حجم البيانات', units: [['B','بايت',1],['KB','كيلوبايت عشري',1e3],['MB','ميغابايت عشري',1e6],['GB','غيغابايت عشري',1e9],['TB','تيرابايت عشري',1e12],['KiB','كيبيبايت ثنائي',1024],['MiB','ميبيبايت ثنائي',1024**2],['GiB','غيبيبايت ثنائي',1024**3],['TiB','تيبيبايت ثنائي',1024**4]] },
    'time-unit-converter': { title: 'محول وحدات الزمن', label: 'المدة', units: [['ms','مللي ثانية',.001],['s','ثانية',1],['min','دقيقة',60],['h','ساعة',3600],['d','يوم (24 ساعة)',86400],['wk','أسبوع (7 أيام)',604800],['yr','سنة اصطلاحية (365 يومًا)',31536000]] }
  };

  for (const config of Object.values(tools)) {
    config.fields = [
      { id: 'value', label: `قيمة ${config.label}`, type: 'number', min: 0, step: 'any', value: 1 },
      { id: 'from', label: 'من الوحدة', type: 'select', options: config.units.map(([id, name]) => [id, name]) },
      { id: 'to', label: 'إلى الوحدة', type: 'select', options: config.units.map(([id, name]) => [id, name]) }
    ];
    config.hint = 'أدخل كمية غير سالبة، ثم اختر الوحدة الأصلية والوحدة المطلوبة. تُحسب عوامل التحويل دون إرسال القيمة إلى خدمة خارجية.';
  }
  tools['temperature-converter'] = {
    title: 'محول الحرارة', label: 'درجة الحرارة', units: [['C','مئوية °C'],['F','فهرنهايت °F'],['K','كلفن K']],
    hint: 'حوّل بين المئوية والفهرنهايت والكلفن. درجات الحرارة المطلقة الأدنى من الصفر المطلق غير صالحة.',
    fields: [
      { id: 'value', label: 'درجة الحرارة', type: 'number', step: 'any', value: 0 },
      { id: 'from', label: 'وحدة الدرجة المدخلة', type: 'select', options: [['C','مئوية °C'],['F','فهرنهايت °F'],['K','كلفن K']] },
      { id: 'to', label: 'وحدة النتيجة', type: 'select', options: [['C','مئوية °C'],['F','فهرنهايت °F'],['K','كلفن K']] }
    ]
  };

  function number(value, label) {
    if (value === null || value === undefined || String(value).trim() === '') throw new Error(`أدخل ${label} رقمًا صالحًا.`);
    const result = Number(value);
    if (!Number.isFinite(result)) throw new Error(`أدخل ${label} رقمًا صالحًا.`);
    return result;
  }
  function fmt(value) {
    if (!Number.isFinite(value)) throw new Error('تعذر تمثيل الناتج؛ استخدم قيمة أصغر.');
    return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 8 }).format(value);
  }
  function unitName(config, code) {
    const found = config.units.find(unit => unit[0] === code);
    if (!found) throw new Error('اختر وحدة صالحة من القائمتين.');
    return found[1];
  }
  function convert(slug, input) {
    const config = tools[slug];
    if (!config) throw new Error('أداة التحويل غير معروفة.');
    const value = number(input.value, config.label);
    const from = String(input.from), to = String(input.to);
    const fromName = unitName(config, from), toName = unitName(config, to);
    let result, base;
    if (slug === 'temperature-converter') {
      const celsius = from === 'C' ? value : from === 'F' ? (value - 32) * 5 / 9 : value - 273.15;
      if (celsius < -273.15 - 1e-10) throw new Error('درجة الحرارة أقل من الصفر المطلق (−273.15 °C)، لذلك لا يمكن تحويلها.');
      base = celsius;
      result = to === 'C' ? celsius : to === 'F' ? celsius * 9 / 5 + 32 : celsius + 273.15;
      if (Object.is(result, -0)) result = 0;
      const equations = { 'C-F':'F=C×9/5+32', 'C-K':'K=C+273.15', 'F-C':'C=(F−32)×5/9', 'F-K':'C=(F−32)×5/9 ثم K=C+273.15', 'K-C':'C=K−273.15', 'K-F':'C=K−273.15 ثم F=C×9/5+32' };
      return { 'النتيجة': `${fmt(result)} ${toName}`, 'المعادلة المستخدمة': equations[`${from}-${to}`] || 'الوحدتان متماثلتان؛ لا يتغير الرقم.', 'القيمة المعيارية': `${fmt(celsius)} °C`, 'الوحدات': `${fromName} ← ${toName}` };
    }
    if (value < 0) throw new Error('القيم السالبة لا تمثل مقدارًا صالحًا في هذه الأداة.');
    const fromFactor = config.units.find(unit => unit[0] === from)[2];
    const toFactor = config.units.find(unit => unit[0] === to)[2];
    base = value * fromFactor;
    result = base / toFactor;
    if (!Number.isFinite(result) || !Number.isFinite(base)) throw new Error('القيمة كبيرة جدًا للحساب الدقيق؛ أدخل كمية أصغر.');
    const output = { 'النتيجة': `${fmt(result)} ${toName}`, 'عامل المصدر إلى الوحدة المرجعية': `${fmt(fromFactor)} لكل ${unitName(config, from)}`, 'عامل الوحدة الهدف إلى الوحدة المرجعية': `${fmt(toFactor)} لكل ${unitName(config, to)}`, 'القيمة المرجعية': `${fmt(base)} ${slug === 'length-converter' ? 'متر' : slug === 'weight-converter' ? 'كيلوغرام' : slug === 'area-converter' ? 'متر مربع' : slug === 'volume-converter' ? 'لتر' : slug === 'speed-converter' ? 'متر/ثانية' : slug === 'pressure-converter' ? 'باسكال' : slug === 'energy-converter' ? 'جول' : slug === 'data-size-converter' ? 'بايت' : 'ثانية'}` };
    if (slug === 'weight-converter') output['توضيح'] = 'هذه مقارنة لوحدات الكتلة. الوزن الفيزيائي قوة تتأثر بتسارع الجاذبية.';
    if (slug === 'data-size-converter') output['أساس الوحدات'] = `${fromName}: ${fmt(fromFactor)} بايت؛ ${toName}: ${fmt(toFactor)} بايت. الوحدات العشرية تستخدم 1000 والثنائية 1024.`;
    if (slug === 'time-unit-converter' && (from === 'yr' || to === 'yr')) output['تعريف السنة'] = 'السنة هنا اصطلاحية من 365 يومًا، وليست سنة تقويمية مرتبطة بتاريخ محدد.';
    return output;
  }

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function fieldMarkup(field) {
    if (field.type === 'select') return `<div class="form-field"><label for="${field.id}">${esc(field.label)}</label><select id="${field.id}" name="${field.id}" required>${field.options.map(([v, label]) => `<option value="${esc(v)}">${esc(label)}</option>`).join('')}</select></div>`;
    return `<div class="form-field"><label for="${field.id}">${esc(field.label)}</label><input id="${field.id}" name="${field.id}" type="number" min="${field.min ?? ''}" step="${field.step || 'any'}" value="${field.value ?? ''}" required></div>`;
  }
  function mount(rootElement) {
    const slug = rootElement.dataset.tool, config = tools[slug];
    if (!config) return;
    rootElement.innerHTML = `<form class="tool-form"><div class="form-grid">${config.fields.map(fieldMarkup).join('')}</div><p class="tool-note">${esc(config.hint)}</p><div class="action-row"><button class="button-primary" type="submit">حوّل الوحدات</button><button class="button-quiet" type="reset">مسح</button></div><div class="result-box" aria-live="polite"></div></form>`;
    const form = rootElement.querySelector('form'), box = rootElement.querySelector('.result-box');
    form.addEventListener('submit', event => {
      event.preventDefault();
      try {
        const input = Object.fromEntries(new FormData(form).entries());
        const output = convert(slug, input);
        box.innerHTML = `<h3>نتيجة التحويل</h3><dl>${Object.entries(output).map(([key,value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
        box.classList.add('visible'); box.classList.remove('error-message');
      } catch (error) { box.textContent = error.message || 'تعذر إكمال التحويل.'; box.classList.add('visible','error-message'); }
    });
    form.addEventListener('reset', () => { box.replaceChildren(); box.classList.remove('visible','error-message'); });
  }
  return { tools, convert, mount };
});
