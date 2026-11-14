(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.MuhtawaaSaudiTools = root.MuhtawaaSaudiTools || {};
    for (const slug of ['hijri-converter', 'age-calculator', 'hijri-calendar']) root.MuhtawaaSaudiTools[slug] = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DATA_PATH = '/data/ummalqura-1356-1500.json';
  const MONTHS_AR = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
  const WEEKDAYS_AR = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  const number = value => new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(value);
  let dataPromise;

  function loadData() {
    if (!dataPromise) dataPromise = fetch(DATA_PATH).then(response => {
      if (!response.ok) throw new Error('تعذر تحميل جدول التقويم الثابت.');
      return response.json();
    }).then(buildIndex);
    return dataPromise;
  }

  function buildIndex(payload) {
    if (payload.calendar !== 'islamic-umalqura' || payload.hijriDateByGregorianDay.length !== payload.dayCount) throw new Error('جدول التقويم غير صالح.');
    const start = parseGregorian(payload.gregorianStart);
    const end = parseGregorian(payload.gregorianEnd);
    if (!start || !end || payload.hijriDateByGregorianDay[0] !== 13560101 || payload.hijriDateByGregorianDay.at(-1) !== 15001230) throw new Error('حدود التقويم غير مطابقة.');
    const hijriToIndex = new Map();
    const monthLengths = new Map();
    const monthStarts = new Map();
    for (let i = 0; i < payload.hijriDateByGregorianDay.length; i += 1) {
      const code = payload.hijriDateByGregorianDay[i];
      if (!Number.isInteger(code)) throw new Error('مدخل غير صالح في جدول التقويم.');
      hijriToIndex.set(code, i);
      const { year, month, day } = splitHijri(code);
      const key = monthKey(year, month);
      monthLengths.set(key, (monthLengths.get(key) || 0) + 1);
      if (day === 1) monthStarts.set(key, i);
    }
    return { payload, start, end, hijriToIndex, monthLengths, monthStarts };
  }

  function parseGregorian(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return date;
  }

  function dateIso(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function indexForGregorian(value, data) {
    const date = parseGregorian(value);
    if (!date) return null;
    const index = Math.floor((date.getTime() - data.start.getTime()) / 86400000);
    return index >= 0 && index < data.payload.dayCount ? index : null;
  }

  function gregorianAt(index, data) {
    if (!Number.isInteger(index) || index < 0 || index >= data.payload.dayCount) return null;
    return new Date(data.start.getTime() + index * 86400000);
  }

  function splitHijri(code) {
    return { year: Math.floor(code / 10000), month: Math.floor(code / 100) % 100, day: code % 100 };
  }

  function hijriCode(year, month, day) {
    return Number(year) * 10000 + Number(month) * 100 + Number(day);
  }

  function monthKey(year, month) { return `${year}-${String(month).padStart(2, '0')}`; }

  function hijriAt(index, data) {
    if (!Number.isInteger(index) || index < 0 || index >= data.payload.dayCount) return null;
    return splitHijri(data.payload.hijriDateByGregorianDay[index]);
  }

  function currentGregorianIso(now = new Date()) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function hijriLabel(value, includeYear = true) {
    const d = typeof value === 'number' ? splitHijri(value) : value;
    if (!d || d.month < 1 || d.month > 12) return '';
    return `${number(d.day)} ${MONTHS_AR[d.month - 1]}${includeYear ? ` ${number(d.year)} هـ` : ''}`;
  }

  function gregorianLabel(date) {
    return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  }

  function rangeMessage(data) {
    return `النطاق المدعوم: ${data.payload.hijriStart} إلى ${data.payload.hijriEnd} هـ (${data.payload.gregorianStart} إلى ${data.payload.gregorianEnd} م). التاريخ خارج هذا النطاق.`;
  }

  function hDateIndex(year, month, day, data) {
    if (![year, month, day].every(Number.isInteger) || month < 1 || month > 12 || year < 1356 || year > 1500) return null;
    return data.hijriToIndex.get(hijriCode(year, month, day)) ?? null;
  }

  function hijriMonthLength(year, month, data) {
    return data.monthLengths.get(monthKey(year, month)) || 0;
  }

  function addHijriMonths(date, count, data) {
    const total = date.year * 12 + date.month - 1 + count;
    const year = Math.floor(total / 12), month = total - year * 12 + 1;
    const day = Math.min(date.day, hijriMonthLength(year, month, data));
    return day ? { year, month, day } : null;
  }

  function compareHijri(a, b) {
    return a.year - b.year || a.month - b.month || a.day - b.day;
  }

  function calculateHijriAge(startDate, endDate, data) {
    if (compareHijri(startDate, endDate) > 0) return null;
    const startIndex = hDateIndex(startDate.year, startDate.month, startDate.day, data);
    const endIndex = hDateIndex(endDate.year, endDate.month, endDate.day, data);
    if (startIndex === null || endIndex === null) return null;
    let years = endDate.year - startDate.year;
    const anniversaryDay = Math.min(startDate.day, hijriMonthLength(endDate.year, startDate.month, data));
    if (compareHijri(endDate, { year: endDate.year, month: startDate.month, day: anniversaryDay }) < 0) years -= 1;
    let anchor = { year: startDate.year + years, month: startDate.month, day: Math.min(startDate.day, hijriMonthLength(startDate.year + years, startDate.month, data)) };
    let months = (endDate.year - anchor.year) * 12 + endDate.month - anchor.month;
    let monthAnchor = addHijriMonths(anchor, months, data);
    if (compareHijri(monthAnchor, endDate) > 0) months -= 1;
    monthAnchor = addHijriMonths(anchor, months, data);
    const anchorIndex = hDateIndex(monthAnchor.year, monthAnchor.month, monthAnchor.day, data);
    return anchorIndex === null ? null : { years, months, days: endIndex - anchorIndex };
  }

  function calculateGregorianAge(startDate, endDate) {
    const start = parseGregorian(startDate), end = parseGregorian(endDate);
    if (!start || !end || start > end) return null;
    const dayIn = date => date.getUTCDate();
    const dim = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const clamp = (year, month, day) => new Date(Date.UTC(year, month, Math.min(day, dim(year, month))));
    let years = end.getUTCFullYear() - start.getUTCFullYear();
    if (end < clamp(end.getUTCFullYear(), start.getUTCMonth(), dayIn(start))) years -= 1;
    const lastBirthday = clamp(start.getUTCFullYear() + years, start.getUTCMonth(), dayIn(start));
    const totalMonths = (end.getUTCFullYear() - lastBirthday.getUTCFullYear()) * 12 + end.getUTCMonth() - lastBirthday.getUTCMonth();
    const addMonths = (date, count) => {
      const total = date.getUTCFullYear() * 12 + date.getUTCMonth() + count;
      return clamp(Math.floor(total / 12), total % 12, dayIn(date));
    };
    let months = totalMonths;
    if (addMonths(lastBirthday, months) > end) months -= 1;
    const anchor = addMonths(lastBirthday, months);
    return { years, months, days: Math.round((end - anchor) / 86400000) };
  }

  function ageLabel(parts, calendar) {
    return `${number(parts.years)} ${calendar === 'hijri' ? 'سنة هجرية' : 'سنة'}، ${number(parts.months)} شهر، ${number(parts.days)} يوم`;
  }

  function hijriFields(prefix, initial = {}) {
    return `<div class="form-grid"><div class="form-field"><label for="${prefix}-day">اليوم الهجري</label><input id="${prefix}-day" type="number" min="1" max="30" value="${initial.day ?? ''}" required inputmode="numeric"></div><div class="form-field"><label for="${prefix}-month">الشهر الهجري</label><select id="${prefix}-month">${MONTHS_AR.map((m, i) => `<option value="${i + 1}" ${Number(initial.month) === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select></div><div class="form-field"><label for="${prefix}-year">السنة الهجرية</label><input id="${prefix}-year" type="number" min="1356" max="1500" value="${initial.year ?? ''}" required inputmode="numeric"></div></div>`;
  }

  function readHijriFields(prefix, rootElement) {
    return {
      day: Number(rootElement.querySelector(`#${prefix}-day`).value),
      month: Number(rootElement.querySelector(`#${prefix}-month`).value),
      year: Number(rootElement.querySelector(`#${prefix}-year`).value)
    };
  }

  function showResult(element, text, isError = false) {
    element.textContent = text;
    element.classList.add('visible');
    element.classList.toggle('error-message', isError);
  }

  function mountConverter(rootElement, data) {
    const today = currentGregorianIso();
    const todayIndex = indexForGregorian(today, data);
    const currentHijri = todayIndex === null ? { year: 1448, month: 1, day: 1 } : hijriAt(todayIndex, data);
    rootElement.innerHTML = `<form class="tool-form" id="umq-converter-form"><div class="form-field"><label for="umq-direction">اتجاه التحويل</label><select id="umq-direction"><option value="g2h">من ميلادي إلى هجري</option><option value="h2g">من هجري إلى ميلادي</option></select></div><div id="umq-gregorian-fields"><div class="form-field"><label for="umq-gregorian">التاريخ الميلادي</label><input id="umq-gregorian" type="date" value="${today}" required></div></div><div id="umq-hijri-fields" hidden>${hijriFields('umq-hijri', currentHijri)}</div><div class="action-row"><button class="button-primary" type="submit">حوّل التاريخ</button><button class="button-quiet" type="reset">مسح</button></div><div class="result-box" id="umq-converter-result" aria-live="polite"></div></form><p class="tool-note">يستخدم الجدول الثابت للتحويلات الواقعة ضمن النطاق المعلن فقط؛ لا تُجرى اتصالات خارجية عند الاستخدام.</p>`;
    const form = rootElement.querySelector('#umq-converter-form');
    const direction = rootElement.querySelector('#umq-direction');
    const gregorianFields = rootElement.querySelector('#umq-gregorian-fields');
    const hijriFieldsElement = rootElement.querySelector('#umq-hijri-fields');
    const result = rootElement.querySelector('#umq-converter-result');
    direction.addEventListener('change', () => {
      const gregorianMode = direction.value === 'g2h';
      gregorianFields.hidden = !gregorianMode;
      hijriFieldsElement.hidden = gregorianMode;
      gregorianFields.querySelectorAll('input').forEach(input => { input.required = gregorianMode; });
      hijriFieldsElement.querySelectorAll('input').forEach(input => { input.required = !gregorianMode; });
      result.classList.remove('visible');
    });
    gregorianFields.querySelectorAll('input').forEach(input => { input.required = true; });
    hijriFieldsElement.querySelectorAll('input').forEach(input => { input.required = false; });
    form.addEventListener('reset', () => setTimeout(() => { result.classList.remove('visible'); result.textContent = ''; }, 0));
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (direction.value === 'g2h') {
        const value = rootElement.querySelector('#umq-gregorian').value;
        const index = indexForGregorian(value, data);
        if (index === null) return showResult(result, rangeMessage(data), true);
        const hijri = hijriAt(index, data);
        showResult(result, `${value} م يوافق ${hijriLabel(hijri)}.`);
      } else {
        const hijri = readHijriFields('umq-hijri', rootElement);
        const index = hDateIndex(hijri.year, hijri.month, hijri.day, data);
        if (index === null) return showResult(result, rangeMessage(data), true);
        const gregorian = gregorianAt(index, data);
        showResult(result, `${hijriLabel(hijri)} يوافق ${gregorianLabel(gregorian)} (${dateIso(gregorian)} م).`);
      }
    });
  }

  function mountAge(rootElement, data) {
    const today = currentGregorianIso();
    const todayIndex = indexForGregorian(today, data);
    const currentHijri = todayIndex === null ? { year: 1448, month: 1, day: 1 } : hijriAt(todayIndex, data);
    rootElement.innerHTML = `<form class="tool-form" id="age-form"><div class="form-field"><label for="age-calendar">نظام التاريخ</label><select id="age-calendar"><option value="gregorian">ميلادي</option><option value="hijri">هجري أم القرى</option></select></div><div id="age-gregorian-fields"><div class="form-grid"><div class="form-field"><label for="age-birth-g">تاريخ الميلاد</label><input id="age-birth-g" type="date" required max="${today}"></div><div class="form-field"><label for="age-end-g">احسب العمر حتى</label><input id="age-end-g" type="date" value="${today}" required></div></div></div><div id="age-hijri-fields" hidden><div class="form-field"><strong>تاريخ الميلاد الهجري</strong>${hijriFields('age-birth-h')}</div><div class="form-field"><strong>احسب العمر حتى</strong>${hijriFields('age-end-h', currentHijri)}</div></div><div class="action-row"><button class="button-primary" type="submit">احسب العمر</button><button class="button-quiet" type="reset">مسح</button></div><div class="result-box" id="age-result" aria-live="polite"></div></form><p class="tool-note">للعمر الهجري، تقارن الحاسبة تواريخ أم القرى ضمن الفترة المدعومة. التاريخ خارج الفترة يظهر برسالة واضحة.</p>`;
    const form = rootElement.querySelector('#age-form');
    const calendar = rootElement.querySelector('#age-calendar');
    const gregorianFields = rootElement.querySelector('#age-gregorian-fields');
    const hijriFieldsElement = rootElement.querySelector('#age-hijri-fields');
    const result = rootElement.querySelector('#age-result');
    calendar.addEventListener('change', () => {
      const useHijri = calendar.value === 'hijri';
      gregorianFields.hidden = useHijri;
      hijriFieldsElement.hidden = !useHijri;
      gregorianFields.querySelectorAll('input').forEach(input => { input.required = !useHijri; });
      hijriFieldsElement.querySelectorAll('input').forEach(input => { input.required = useHijri; });
      result.classList.remove('visible');
    });
    gregorianFields.querySelectorAll('input').forEach(input => { input.required = true; });
    hijriFieldsElement.querySelectorAll('input').forEach(input => { input.required = false; });
    form.addEventListener('reset', () => setTimeout(() => { result.classList.remove('visible'); result.textContent = ''; }, 0));
    form.addEventListener('submit', event => {
      event.preventDefault();
      let parts;
      let calendarName;
      if (calendar.value === 'hijri') {
        const start = readHijriFields('age-birth-h', rootElement);
        const end = readHijriFields('age-end-h', rootElement);
        const startIndex = hDateIndex(start.year, start.month, start.day, data);
        const endIndex = hDateIndex(end.year, end.month, end.day, data);
        if (startIndex === null || endIndex === null) return showResult(result, rangeMessage(data), true);
        if (startIndex > endIndex) return showResult(result, 'يجب ألا يسبق تاريخ الحساب تاريخ الميلاد.', true);
        parts = calculateHijriAge(start, end, data);
        calendarName = 'hijri';
      } else {
        const start = rootElement.querySelector('#age-birth-g').value;
        const end = rootElement.querySelector('#age-end-g').value;
        if (!parseGregorian(start) || !parseGregorian(end)) return showResult(result, 'أدخل تاريخين ميلاديين صالحين.', true);
        parts = calculateGregorianAge(start, end);
        calendarName = 'gregorian';
      }
      if (!parts) return showResult(result, 'تعذر حساب العمر من التاريخين المدخلين.', true);
      showResult(result, `العمر: ${ageLabel(parts, calendarName)}.`);
    });
  }

  function monthCalendarMarkup(year, month, data, todayIndex) {
    const key = monthKey(year, month);
    const startIndex = data.monthStarts.get(key);
    const length = hijriMonthLength(year, month, data);
    if (startIndex === undefined || !length) return '<p class="tool-note">الشهر خارج النطاق المدعوم.</p>';
    const firstGregorian = gregorianAt(startIndex, data);
    const leading = (firstGregorian.getUTCDay() + 1) % 7;
    const cells = [];
    for (let i = 0; i < leading; i += 1) cells.push('<div class="hijri-day-cell is-empty" aria-hidden="true"></div>');
    for (let day = 1; day <= length; day += 1) {
      const g = gregorianAt(startIndex + day - 1, data);
      const isToday = todayIndex === startIndex + day - 1;
      cells.push(`<div class="hijri-day-cell${isToday ? ' is-today' : ''}"${isToday ? ' aria-current="date"' : ''}><strong>${number(day)}</strong><small>${number(g.getUTCDate())} ${new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { timeZone: 'UTC', month: 'short' }).format(g)}</small></div>`);
    }
    return `<div class="hijri-weekdays">${WEEKDAYS_AR.map(day => `<span>${day}</span>`).join('')}</div><div class="hijri-calendar-grid">${cells.join('')}</div>`;
  }

  function mountCalendar(rootElement, data) {
    const today = currentGregorianIso();
    const todayIndex = indexForGregorian(today, data);
    if (todayIndex === null) {
      rootElement.innerHTML = `<p class="error-message">${rangeMessage(data)}</p>`;
      return;
    }
    const current = hijriAt(todayIndex, data);
    rootElement.innerHTML = `<div class="tool-form"><p class="hijri-today-label">تاريخ اليوم: <strong>${hijriLabel(current)}</strong></p><p class="result-muted">الموافق ${gregorianLabel(gregorianAt(todayIndex, data))} م</p><div class="hijri-calendar-controls"><button class="button-quiet" id="hcal-prev" type="button" aria-label="الشهر السابق">السابق</button><label for="hcal-month">الشهر الهجري</label><select id="hcal-month">${MONTHS_AR.map((m, i) => `<option value="${i + 1}" ${current.month === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select><input id="hcal-year" type="number" min="1356" max="1500" value="${current.year}" aria-label="السنة الهجرية"><button class="button-quiet" id="hcal-next" type="button" aria-label="الشهر التالي">التالي</button></div><div id="hcal-grid" aria-live="polite"></div></div><p class="tool-note">يعرض التقويم تقويم أم القرى في النطاق المدعوم، ولا يُعد إعلانًا عن رؤية الهلال أو مرجعًا مستقلًا للمواعيد الشرعية.</p>`;
    const monthSelect = rootElement.querySelector('#hcal-month');
    const yearInput = rootElement.querySelector('#hcal-year');
    const grid = rootElement.querySelector('#hcal-grid');
    const render = () => {
      const year = Number(yearInput.value), month = Number(monthSelect.value);
      grid.innerHTML = monthCalendarMarkup(year, month, data, todayIndex);
    };
    const step = amount => {
      let year = Number(yearInput.value), month = Number(monthSelect.value) + amount;
      if (month < 1) { month = 12; year -= 1; }
      else if (month > 12) { month = 1; year += 1; }
      if (year < 1356 || year > 1500 || !data.monthStarts.has(monthKey(year, month))) return;
      yearInput.value = year;
      monthSelect.value = month;
      render();
    };
    rootElement.querySelector('#hcal-prev').addEventListener('click', () => step(-1));
    rootElement.querySelector('#hcal-next').addEventListener('click', () => step(1));
    monthSelect.addEventListener('change', render);
    yearInput.addEventListener('change', render);
    render();
  }

  function mount(rootElement) {
    const slug = rootElement.dataset.tool;
    rootElement.innerHTML = '<p class="result-muted">جارٍ تحميل جدول التقويم المحلي...</p>';
    loadData().then(data => {
      if (slug === 'hijri-converter') mountConverter(rootElement, data);
      else if (slug === 'age-calculator') mountAge(rootElement, data);
      else if (slug === 'hijri-calendar') mountCalendar(rootElement, data);
      else rootElement.textContent = 'الأداة غير متاحة.';
    }).catch(() => { rootElement.innerHTML = '<p class="error-message">تعذر تحميل جدول التقويم. أعد تحميل الصفحة.</p>'; });
  }

  return { buildIndex, calculateGregorianAge, calculateHijriAge, hDateIndex, hijriAt, hijriLabel, indexForGregorian, loadData, mount, splitHijri };
});
