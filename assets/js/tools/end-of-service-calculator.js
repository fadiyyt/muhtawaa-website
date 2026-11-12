(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.MuhtawaaSaudiTools = root.MuhtawaaSaudiTools || {};
    root.MuhtawaaSaudiTools['end-of-service-calculator'] = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function roundSAR(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function calculateEndOfService(input, settings) {
    const wage = Number(input?.monthlyFinalActualWageSAR);
    const serviceYears = Number(input?.continuousServiceYears);
    const contractType = input?.contractType;
    const endType = input?.endType;
    if (!Number.isFinite(wage) || wage <= 0 || !Number.isFinite(serviceYears) || serviceYears <= 0) {
      return { status: 'invalid', message: 'أدخل الأجر الشهري الأخير ومدة الخدمة بقيم موجبة وصحيحة.' };
    }
    if (!['fixed', 'unlimited'].includes(contractType)) return { status: 'invalid', message: 'اختر نوع العقد.' };
    if (!input.inScopeConfirmed) return { status: 'blocked', message: 'لا تحسب هذه الأداة إلا للعامل المشمول بنظام العمل العام وخارج فترة التجربة وحالات المادة 80 والاستثناءات الخاصة.' };
    if (input.article87Exception) return { status: 'blocked', message: 'حالات المادة 87 لها معاملة خاصة ولا تحسبها هذه النسخة.' };

    const baseSettings = settings?.base || {};
    const firstBandYears = Number(baseSettings.firstBandYears);
    const firstRate = baseSettings.firstBandMonthsPerYear;
    const laterRate = baseSettings.laterBandMonthsPerYear;
    if (!Number.isInteger(firstBandYears) || firstBandYears <= 0 || !firstRate || !laterRate) {
      return { status: 'blocked', message: 'إعدادات طريقة الحساب غير مكتملة.' };
    }

    let multiplier;
    if (serviceYears <= firstBandYears) {
      multiplier = Number(firstRate.numerator) / Number(firstRate.denominator) * serviceYears;
    } else {
      multiplier = Number(firstRate.numerator) / Number(firstRate.denominator) * firstBandYears
        + Number(laterRate.numerator) / Number(laterRate.denominator) * (serviceYears - firstBandYears);
    }
    const baseAmount = wage * multiplier;
    let entitlementRatio = 1;

    if (endType === 'resignation') {
      if (!input.resignationClassificationConfirmed) {
        return { status: 'blocked', message: 'أكد أن الإنهاء مصنف نظاميًا استقالةً تنطبق عليها المادة 85؛ لا تستنتج الأداة هذا التصنيف.' };
      }
      if (serviceYears < 2) {
        return { status: 'blocked', message: 'لا تعرض هذه الأداة نتيجة للاستقالة قبل سنتين؛ النص الرسمي الذي راجعناه لا يحسم مقدارها صراحة.' };
      }
      const bands = settings?.resignation || {};
      if (serviceYears <= firstBandYears) entitlementRatio = Number(bands.twoToFive?.numerator) / Number(bands.twoToFive?.denominator);
      else if (serviceYears < Number(bands.fullAtYears)) entitlementRatio = Number(bands.overFiveToTen?.numerator) / Number(bands.overFiveToTen?.denominator);
      else entitlementRatio = Number(bands.tenOrMore?.numerator) / Number(bands.tenOrMore?.denominator);
    } else if (endType !== 'ordinary') {
      return { status: 'invalid', message: 'اختر نوع انتهاء الخدمة.' };
    }

    if (!Number.isFinite(entitlementRatio) || entitlementRatio <= 0 || entitlementRatio > 1) {
      return { status: 'blocked', message: 'إعداد نسبة الاستحقاق غير صالح.' };
    }
    return {
      status: 'calculated',
      baseAmountSAR: roundSAR(baseAmount),
      entitlementRatio,
      amountSAR: roundSAR(baseAmount * entitlementRatio),
      formula: endType === 'resignation' ? 'مكافأة المادة 84 × نسبة المادة 85' : 'المكافأة الأساسية وفق المادة 84',
      contractType
    };
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function mount(rootElement, settings) {
    rootElement.innerHTML = `
      <form class="tool-form" id="eos-form" novalidate>
        <div class="form-grid">
          <div class="form-field"><label for="eos-contract">نوع العقد</label><select id="eos-contract"><option value="fixed">محدد المدة</option><option value="unlimited">غير محدد المدة</option></select></div>
          <div class="form-field"><label for="eos-wage">الأجر الشهري الأخير الفعلي (ريال)</label><input id="eos-wage" type="number" min="0.01" step="0.01" required inputmode="decimal"></div>
          <div class="form-field"><label for="eos-years">مدة الخدمة المستمرة بالسنوات</label><input id="eos-years" type="number" min="0.01" step="0.01" required inputmode="decimal"><small>أدخل المدة المحسوبة والمعتمدة؛ لا تستنتجها الأداة من التواريخ.</small></div>
          <div class="form-field"><label for="eos-end-type">سبب الانتهاء</label><select id="eos-end-type"><option value="ordinary">انتهاء عقد أو إنهاء عادي غير مشمول بالمادة 80</option><option value="resignation">استقالة مصنفة نظاميًا وفق المادة 85</option></select></div>
        </div>
        <label class="check-row"><input id="eos-scope" type="checkbox"> أؤكد أن العامل مشمول بالنظام العام، وأن الحالة ليست فترة تجربة أو فصلًا مستوفيًا للمادة 80، ولا تنطبق استثناءات خاصة.</label>
        <label class="check-row"><input id="eos-article87" type="checkbox"> تنطبق حالة استثنائية من المادة 87؛ لا تعرض نتيجة تلقائية لهذه الحالة.</label>
        <div class="form-field" id="eos-resignation-confirm-wrap" hidden><label class="check-row"><input id="eos-resignation-confirm" type="checkbox"> أؤكد أن سبب الانتهاء مصنف نظاميًا استقالةً تنطبق عليها المادة 85.</label></div>
        <div class="action-row"><button class="button-primary" type="submit">احسب المكافأة</button><button class="button-quiet" type="reset">مسح</button></div>
        <div class="result-box" id="eos-result" aria-live="polite"></div>
      </form>
      <p class="tool-note">لا تحسب هذه النسخة استقالات أقل من سنتين أو الحالات الخاصة بالمادة 87 أو تاريخ الخدمة اليومي. أدخل الأجر الفعلي الأخير ومدة الخدمة كما اعتمدتهما جهة العمل.</p>`;
    const form = rootElement.querySelector('#eos-form');
    const endType = rootElement.querySelector('#eos-end-type');
    const resignationWrap = rootElement.querySelector('#eos-resignation-confirm-wrap');
    const result = rootElement.querySelector('#eos-result');
    endType.addEventListener('change', () => { resignationWrap.hidden = endType.value !== 'resignation'; });
    form.addEventListener('reset', () => { setTimeout(() => { resignationWrap.hidden = true; result.classList.remove('visible'); result.textContent = ''; }, 0); });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const calculation = calculateEndOfService({
        monthlyFinalActualWageSAR: rootElement.querySelector('#eos-wage').value,
        continuousServiceYears: rootElement.querySelector('#eos-years').value,
        contractType: rootElement.querySelector('#eos-contract').value,
        endType: endType.value,
        inScopeConfirmed: rootElement.querySelector('#eos-scope').checked,
        article87Exception: rootElement.querySelector('#eos-article87').checked,
        resignationClassificationConfirmed: rootElement.querySelector('#eos-resignation-confirm').checked
      }, settings);
      result.classList.add('visible');
      result.classList.toggle('error-message', calculation.status !== 'calculated');
      result.innerHTML = calculation.status === 'calculated'
        ? `<strong>المكافأة التقديرية: ${new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(calculation.amountSAR)} ريال</strong><p>الأساس قبل نسبة الاستقالة: ${new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(calculation.baseAmountSAR)} ريال.</p>`
        : escapeHTML(calculation.message);
    });
  }

  return { calculateEndOfService, mount, roundSAR };
});
