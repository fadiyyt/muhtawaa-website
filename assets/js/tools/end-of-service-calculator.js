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

  function serviceYearsFromParts(years, months, days, settings = {}) {
    const y = Number(years), m = Number(months), d = Number(days);
    const monthsPerYear = Number(settings?.serviceDuration?.monthsPerYear || 12);
    const daysPerMonth = Number(settings?.serviceDuration?.daysPerMonth || 30);
    if (![y, m, d, monthsPerYear, daysPerMonth].every(Number.isFinite)
      || ![y, m, d].every(Number.isInteger) || y < 0 || m < 0 || m >= monthsPerYear
      || d < 0 || d > daysPerMonth || monthsPerYear <= 0 || daysPerMonth <= 0) return null;
    return y + (m * daysPerMonth + d) / (monthsPerYear * daysPerMonth);
  }

  function resignationRatio(serviceYears, settings) {
    const bands = settings?.resignation || {};
    const minimum = Number(bands.minimumEntitlementYears || 2);
    const five = Number(settings?.base?.firstBandYears || 5);
    const ten = Number(bands.fullAtYears || 10);
    if (serviceYears < minimum) return 0;
    if (serviceYears <= five) return Number(bands.twoToFive.numerator) / Number(bands.twoToFive.denominator);
    if (serviceYears < ten) return Number(bands.overFiveToTen.numerator) / Number(bands.overFiveToTen.denominator);
    return Number(bands.tenOrMore.numerator) / Number(bands.tenOrMore.denominator);
  }

  function calculateEndOfService(input, settings) {
    const wage = Number(input?.monthlyFinalActualWageSAR);
    const serviceYears = input?.continuousServiceYears !== undefined
      ? Number(input.continuousServiceYears)
      : serviceYearsFromParts(input?.serviceYears, input?.serviceMonths, input?.serviceDays, settings);
    const endType = input?.endType;
    if (!Number.isFinite(wage) || wage <= 0 || !Number.isFinite(serviceYears) || serviceYears <= 0) {
      return { status: 'invalid', message: 'أدخل الأجر الشهري الأخير ومدة خدمة صحيحة وموجبة.' };
    }
    if (!['ordinary', 'resignation'].includes(endType)) return { status: 'invalid', message: 'اختر سبب انتهاء الخدمة.' };
    if (!input.inScopeConfirmed) return { status: 'blocked', message: 'أكّد أن الحالة ضمن نطاق الحاسبة كما هو موضح في التنبيه.' };

    const baseSettings = settings?.base || {};
    const firstBandYears = Number(baseSettings.firstBandYears);
    const firstRate = baseSettings.firstBandMonthsPerYear;
    const laterRate = baseSettings.laterBandMonthsPerYear;
    if (!Number.isInteger(firstBandYears) || firstBandYears <= 0 || !firstRate || !laterRate) {
      return { status: 'blocked', message: 'إعدادات طريقة الحساب غير مكتملة.' };
    }

    const firstPerYear = Number(firstRate.numerator) / Number(firstRate.denominator);
    const laterPerYear = Number(laterRate.numerator) / Number(laterRate.denominator);
    const multiplier = serviceYears <= firstBandYears
      ? firstPerYear * serviceYears
      : firstPerYear * firstBandYears + laterPerYear * (serviceYears - firstBandYears);
    const baseAmount = wage * multiplier;
    const ratio = endType === 'resignation' ? resignationRatio(serviceYears, settings) : 1;
    if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
      return { status: 'blocked', message: 'إعداد نسبة الاستحقاق غير صالح.' };
    }
    return {
      status: 'calculated',
      baseAmountSAR: roundSAR(baseAmount),
      entitlementRatio: ratio,
      amountSAR: roundSAR(baseAmount * ratio),
      noResignationEntitlement: endType === 'resignation' && ratio === 0,
      formula: endType === 'resignation' ? 'مكافأة المادة 84 × نسبة المادة 85' : 'المكافأة الأساسية وفق المادة 84'
    };
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function mount(rootElement, settings) {
    rootElement.innerHTML = `
      <form class="tool-form" id="eos-form" novalidate>
        <div class="form-grid">
          <div class="form-field"><label for="eos-wage">الأجر الشهري الأخير الفعلي (ريال)</label><input id="eos-wage" type="number" min="0.01" step="0.01" required inputmode="decimal"><small>الأجر الفعلي الأخير هو الأجر المعتمد عند انتهاء العلاقة، وليس بالضرورة الأجر الأساسي وحده؛ أدخل القيمة الواردة في مستندات جهة العمل.</small></div>
          <div class="form-field"><label for="eos-end-type">سبب الانتهاء</label><select id="eos-end-type"><option value="ordinary">انتهاء خدمة غير مصنف استقالةً</option><option value="resignation">استقالة وفق المادة 85</option></select></div>
        </div>
        <fieldset class="form-field"><legend>مدة الخدمة المستمرة المعتمدة</legend><div class="form-grid service-duration-grid"><div class="form-field"><label for="eos-years">سنوات</label><input id="eos-years" type="number" min="0" max="100" step="1" value="0" required inputmode="numeric"></div><div class="form-field"><label for="eos-months">أشهر</label><input id="eos-months" type="number" min="0" max="11" step="1" value="0" required inputmode="numeric"></div><div class="form-field"><label for="eos-days">أيام</label><input id="eos-days" type="number" min="0" max="30" step="1" value="0" required inputmode="numeric"></div></div><small>لأغراض التقدير فقط، يحوّل الجزء إلى سنة على أساس 12 شهرًا والسنة 360 يومًا. أدخل المدة التي اعتمدتها جهة العمل.</small></fieldset>
        <label class="check-row"><input id="eos-scope" type="checkbox"> أؤكد أن الحالة ضمن نظام العمل العام وليست فترة تجربة أو حالة مستثناة بالمادتين 80 أو 87، وأن وصف الاستقالة صحيح عند اختياره. الحاسبة تقديرية وليست تسوية نهائية.</label>
        <div class="action-row"><button class="button-primary" type="submit">احسب المكافأة</button><button class="button-quiet" type="reset">مسح</button></div>
        <div class="result-box" id="eos-result" aria-live="polite"></div>
      </form>
      <p class="tool-note">لا تحسب هذه النسخة التعويضات الأخرى أو الحالات المستثناة. راجع HRSD أو مختصًا عند وجود نزاع أو حالة خاصة.</p>`;
    const form = rootElement.querySelector('#eos-form');
    const result = rootElement.querySelector('#eos-result');
    const money = amount => new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    form.addEventListener('reset', () => { setTimeout(() => { result.classList.remove('visible'); result.textContent = ''; }, 0); });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const calculation = calculateEndOfService({
        monthlyFinalActualWageSAR: rootElement.querySelector('#eos-wage').value,
        serviceYears: rootElement.querySelector('#eos-years').value,
        serviceMonths: rootElement.querySelector('#eos-months').value,
        serviceDays: rootElement.querySelector('#eos-days').value,
        endType: rootElement.querySelector('#eos-end-type').value,
        inScopeConfirmed: rootElement.querySelector('#eos-scope').checked
      }, settings);
      result.classList.add('visible');
      result.classList.toggle('error-message', calculation.status !== 'calculated');
      if (calculation.status !== 'calculated') result.innerHTML = escapeHTML(calculation.message);
      else if (calculation.noResignationEntitlement) result.innerHTML = '<strong>لا استحقاق لمكافأة نهاية الخدمة عند الاستقالة قبل إتمام سنتين وفق حد المادة 85.</strong><p>التقدير الأساسي قبل نسبة الاستقالة: ' + money(calculation.baseAmountSAR) + ' ريال، والناتج المستحق: 0 ريال.</p>';
      else result.innerHTML = `<strong>المكافأة التقديرية: ${money(calculation.amountSAR)} ريال</strong><p>الأساس قبل نسبة الاستقالة: ${money(calculation.baseAmountSAR)} ريال.</p>`;
    });
  }

  return { calculateEndOfService, mount, resignationRatio, roundSAR, serviceYearsFromParts };
});
