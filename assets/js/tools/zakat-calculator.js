(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.MuhtawaaSaudiTools = root.MuhtawaaSaudiTools || {};
    root.MuhtawaaSaudiTools['zakat-calculator'] = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function roundSAR(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }

  function calculateZakat(input, settings) {
    const fields = ['cashSAR', 'goldGrams', 'goldKarat', 'goldPrice24SAR', 'silverGrams', 'silverPriceSAR', 'tradeGoodsSAR'];
    const n = Object.fromEntries(fields.map(key => [key, Number(input?.[key] ?? 0)]));
    if (fields.some(key => !Number.isFinite(n[key]) || n[key] < 0)) return { status: 'invalid', message: 'أدخل أرقامًا غير سالبة وصالحة في جميع الحقول.' };
    if (n.goldKarat < 1 || n.goldKarat > 24 || (n.goldGrams > 0 && n.goldPrice24SAR <= 0) || (n.silverGrams > 0 && n.silverPriceSAR <= 0)) {
      return { status: 'invalid', message: 'أدخل عيارًا من 1 إلى 24 وسعرًا موجبًا لكل معدن أدخلت وزنه.' };
    }

    const nisabSettings = settings?.nisab || {};
    const rate = Number(settings?.rate ?? 0.025);
    const goldValue = n.goldGrams * (n.goldKarat / 24) * n.goldPrice24SAR;
    const silverValue = n.silverGrams * n.silverPriceSAR;
    const totalWealthSAR = n.cashSAR + goldValue + silverValue + n.tradeGoodsSAR;
    let thresholdSAR;
    let thresholdLabel;
    if (input?.nisabMode === 'gold') {
      thresholdSAR = Number(nisabSettings.goldGrams || 85) * n.goldPrice24SAR;
      thresholdLabel = `${nisabSettings.goldGrams || 85} غرامًا من الذهب الخالص`;
    } else if (input?.nisabMode === 'silver') {
      thresholdSAR = Number(nisabSettings.silverGrams || 595) * n.silverPriceSAR;
      thresholdLabel = `${nisabSettings.silverGrams || 595} غرامًا من الفضة الخالصة`;
    } else if (input?.nisabMode === 'manual') {
      thresholdSAR = Number(input.manualNisabSAR);
      thresholdLabel = 'النصاب المخصص الذي أدخلته';
      if (!Number.isFinite(thresholdSAR) || thresholdSAR <= 0) return { status: 'invalid', message: 'أدخل قيمة موجبة للنصاب المخصص.' };
    } else return { status: 'invalid', message: 'اختر طريقة احتساب النصاب.' };

    if (!Number.isFinite(rate) || rate <= 0 || rate >= 1 || !Number.isFinite(thresholdSAR) || thresholdSAR <= 0) {
      return { status: 'blocked', message: 'إعدادات الحاسبة غير مكتملة؛ أدخل أسعار المعادن وتحقق من إعداد النصاب.' };
    }
    const meetsNisab = totalWealthSAR >= thresholdSAR;
    const hawlCompleted = Boolean(input?.hawlCompleted);
    const zakatDueSAR = meetsNisab && hawlCompleted ? roundSAR(totalWealthSAR * rate) : 0;
    return {
      status: 'calculated',
      totalWealthSAR: roundSAR(totalWealthSAR),
      goldValueSAR: roundSAR(goldValue),
      silverValueSAR: roundSAR(silverValue),
      thresholdSAR: roundSAR(thresholdSAR),
      thresholdLabel,
      meetsNisab,
      hawlCompleted,
      rate,
      zakatDueSAR
    };
  }

  function mount(rootElement, settings) {
    rootElement.innerHTML = `<form class="tool-form" id="zakat-form">
      <div class="form-field"><label for="zakat-nisab-mode">طريقة تحديد النصاب</label><select id="zakat-nisab-mode"><option value="gold">ذهب: 85 غرامًا من الذهب الخالص (الافتراضي)</option><option value="silver">فضة: 595 غرامًا من الفضة الخالصة</option><option value="manual">قيمة نصاب مخصصة بالريال</option></select></div>
      <div class="form-field" id="zakat-manual-wrap" hidden><label for="zakat-manual">قيمة النصاب المخصص (ريال)</label><input id="zakat-manual" type="number" min="0.01" step="0.01" inputmode="decimal"></div>
      <div class="form-grid"><div class="form-field"><label for="zakat-cash">النقد والأرصدة (ريال)</label><input id="zakat-cash" type="number" min="0" step="0.01" value="0" inputmode="decimal"></div><div class="form-field"><label for="zakat-trade">قيمة عروض التجارة (ريال)</label><input id="zakat-trade" type="number" min="0" step="0.01" value="0" inputmode="decimal"></div></div>
      <fieldset class="form-field"><legend>الذهب الذي يدخل في الوعاء</legend><div class="form-grid"><div class="form-field"><label for="zakat-gold-grams">الوزن (غرام)</label><input id="zakat-gold-grams" type="number" min="0" step="0.001" value="0" inputmode="decimal"></div><div class="form-field"><label for="zakat-gold-karat">العيار</label><input id="zakat-gold-karat" type="number" min="1" max="24" step="1" value="24" inputmode="numeric"></div><div class="form-field"><label for="zakat-gold-price">سعر غرام 24 قيراط في يوم الوجوب (ريال)</label><input id="zakat-gold-price" type="number" min="0" step="0.01" value="0" inputmode="decimal"></div></div></fieldset>
      <fieldset class="form-field"><legend>الفضة التي تدخل في الوعاء</legend><div class="form-grid"><div class="form-field"><label for="zakat-silver-grams">الوزن الخالص (غرام)</label><input id="zakat-silver-grams" type="number" min="0" step="0.001" value="0" inputmode="decimal"></div><div class="form-field"><label for="zakat-silver-price">سعر الغرام في يوم الوجوب (ريال)</label><input id="zakat-silver-price" type="number" min="0" step="0.01" value="0" inputmode="decimal"></div></div></fieldset>
      <label class="check-row"><input id="zakat-hawl" type="checkbox"> أتم المال حولًا قمريًا وهو مملوك لي</label>
      <div class="action-row"><button class="button-primary" type="submit">احسب الزكاة</button><button class="button-quiet" type="reset">مسح</button></div><div class="result-box" id="zakat-result" aria-live="polite"></div>
    </form><p class="tool-note">أدخل أسعار المعادن في يوم وجوب الزكاة. لا تُدخل حلي الاستعمال الشخصي وفق منهج دليل ZATCA؛ ولا تخصم الأداة الديون. حدّد منهج النصاب الذي تتبعه، واستشر مختصًا عند اختلاف الحكم أو الحاجة لتقدير شرعي.</p>`;
    const form = rootElement.querySelector('#zakat-form');
    const mode = rootElement.querySelector('#zakat-nisab-mode');
    const manual = rootElement.querySelector('#zakat-manual-wrap');
    const result = rootElement.querySelector('#zakat-result');
    const money = value => `${new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} ريال`;
    mode.addEventListener('change', () => { manual.hidden = mode.value !== 'manual'; });
    form.addEventListener('reset', () => setTimeout(() => { manual.hidden = true; result.classList.remove('visible'); result.textContent = ''; }, 0));
    form.addEventListener('submit', event => {
      event.preventDefault();
      const value = id => rootElement.querySelector(`#${id}`).value;
      const calculation = calculateZakat({
        nisabMode: mode.value,
        manualNisabSAR: value('zakat-manual'),
        cashSAR: value('zakat-cash'),
        tradeGoodsSAR: value('zakat-trade'),
        goldGrams: value('zakat-gold-grams'),
        goldKarat: value('zakat-gold-karat'),
        goldPrice24SAR: value('zakat-gold-price'),
        silverGrams: value('zakat-silver-grams'),
        silverPriceSAR: value('zakat-silver-price'),
        hawlCompleted: rootElement.querySelector('#zakat-hawl').checked
      }, settings);
      result.classList.add('visible');
      result.classList.toggle('error-message', calculation.status !== 'calculated');
      if (calculation.status !== 'calculated') { result.textContent = calculation.message; return; }
      const eligibility = !calculation.meetsNisab ? 'لم يبلغ الوعاء النصاب المحدد.' : !calculation.hawlCompleted ? 'لم يكتمل الحول القمري؛ لا يظهر مبلغ واجب في هذا التقدير.' : 'اكتمل النصاب والحول وفق المدخلات.';
      result.innerHTML = `<strong>مبلغ الزكاة التقديري: ${money(calculation.zakatDueSAR)}</strong><p>${eligibility}</p><p>إجمالي الوعاء: ${money(calculation.totalWealthSAR)} — النصاب المختار (${calculation.thresholdLabel}): ${money(calculation.thresholdSAR)}.</p>`;
    });
  }

  return { calculateZakat, mount, roundSAR };
});
