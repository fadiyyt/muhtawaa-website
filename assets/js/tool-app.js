(() => {
  const root = document.querySelector('[data-tool]');
  if (!root) return;
  const tool = root.dataset.tool;
  const $ = (selector, base = root) => base.querySelector(selector);
  const $$ = (selector, base = root) => [...base.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const button = (label, className = 'button-primary', type = 'button') => `<button type="${type}" class="${className}">${label}</button>`;
  const result = (id = 'tool-result') => `<div id="${id}" class="result-box" aria-live="polite"></div>`;
  const showResult = (box, html, isError = false) => { box.innerHTML = html; box.classList.add('visible'); box.classList.toggle('error-message', isError); };
  const error = message => `<span class="error-message">${esc(message)}</span>`;
  function formatLocalDate(date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
  const today = () => formatLocalDate(new Date());
  const numberValue = selector => Number($(selector)?.value);
  const validNumber = value => Number.isFinite(value);
  const fileToDataURL = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  const loadImage = src => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
  const downloadBlob = (blob, filename) => { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const copyText = async value => { try { await navigator.clipboard.writeText(value); return true; } catch { return false; } };

  function ageMarkup() { return `<form class="tool-form" id="age-form"><div class="form-grid"><div class="form-field"><label for="birth-date">تاريخ الميلاد</label><input id="birth-date" type="date" required max="${today()}"></div><div class="form-field"><label for="age-on">احسب العمر حتى</label><input id="age-on" type="date" value="${today()}" required></div></div><div class="action-row">${button('احسب العمر', 'button-primary', 'submit')} ${button('مسح', 'button-quiet', 'reset')}</div></form>${result()}`; }
  function dateDiffMarkup() { return `<form class="tool-form" id="diff-form"><div class="form-grid"><div class="form-field"><label for="date-start">تاريخ البداية</label><input id="date-start" type="date" required></div><div class="form-field"><label for="date-end">تاريخ النهاية</label><input id="date-end" type="date" required></div></div><div class="action-row">${button('احسب الفرق', 'button-primary', 'submit')} ${button('مسح', 'button-quiet', 'reset')}</div></form>${result()}`; }
  function hijriMarkup() { return `<form class="tool-form" id="hijri-form"><div class="form-field"><label for="gregorian-date">التاريخ الميلادي</label><input id="gregorian-date" type="date" value="${today()}" required></div><div class="action-row">${button('حوّل إلى هجري', 'button-primary', 'submit')}</div></form>${result()}`; }
  function wordMarkup() { return `<div class="tool-form"><div class="form-field"><label for="word-text">النص</label><textarea id="word-text" placeholder="اكتب أو ألصق النص هنا..."></textarea></div><div class="action-row">${button('نسخ النص', 'button-quiet')}</div></div><div class="quick-tools" id="word-stats"><div class="tool-note"><strong>0</strong><br>كلمة</div><div class="tool-note"><strong>0</strong><br>حرف</div><div class="tool-note"><strong>0</strong><br>سطر</div><div class="tool-note"><strong>0</strong><br>حرف بدون مسافات</div></div>`; }
  function qrMarkup() { return `<div class="tool-form"><div class="form-field"><label for="qr-text">الرابط أو النص</label><textarea id="qr-text" placeholder="https://muhtawaa.com/tools/word-counter.html"></textarea></div><div class="action-row">${button('إنشاء الرمز', 'button-primary')} ${button('تنزيل الصورة', 'button-quiet')}</div></div><div class="qr-box" id="qr-output"><span class="result-muted">سيظهر رمز QR هنا</span></div>`; }
  function imageMarkup(kind) { const label = kind === 'compress' ? 'اختر صورة لضغطها' : kind === 'resize' ? 'اختر صورة لتغيير حجمها' : 'اختر صورة للتحويل'; return `<div class="tool-form"><label class="file-input" for="image-file"><strong>${label}</strong><br><span class="result-muted">JPG أو PNG أو WebP</span></label><input id="image-file" type="file" accept="image/*"><div id="image-options"></div><div class="preview-area" id="image-preview"><span class="result-muted">ستظهر المعاينة هنا</span></div><div class="action-row" id="image-actions"></div></div>`; }
  function cleanerMarkup() { return `<div class="tool-form"><div class="form-field"><label for="dirty-text">النص الأصلي</label><textarea id="dirty-text" placeholder="ألصق النص الذي تريد ترتيبه..."></textarea></div><div class="action-row"><label class="check-row"><input id="trim-spaces" type="checkbox" checked> إزالة المسافات الزائدة</label><label class="check-row"><input id="remove-duplicates" type="checkbox"> إزالة الأسطر المكررة</label></div>${button('تنظيف النص', 'button-primary')}<div class="form-field"><label for="clean-text">النص الناتج</label><textarea id="clean-text" readonly></textarea></div>${button('نسخ النتيجة', 'button-quiet')}</div>`; }
  function invoiceMarkup() { return `<form class="tool-form" id="invoice-form"><div class="form-grid"><div class="form-field"><label for="invoice-business">اسم النشاط</label><input id="invoice-business" value="اسم النشاط"></div><div class="form-field"><label for="invoice-number">رقم الفاتورة</label><input id="invoice-number" value="INV-001"></div><div class="form-field"><label for="invoice-client">اسم العميل</label><input id="invoice-client" placeholder="اسم العميل"></div><div class="form-field"><label for="invoice-date">التاريخ</label><input id="invoice-date" type="date" value="${today()}"></div></div><div id="invoice-items"></div><div class="action-row">${button('إضافة بند', 'button-quiet')} ${button('تحديث المعاينة', 'button-primary')} ${button('طباعة الفاتورة', 'button-quiet')}</div></form><div class="invoice-preview" id="invoice-preview"></div>`; }

  function percentageMarkup() { return `<form class="tool-form" id="percentage-form"><div class="form-field"><label for="percentage-value">النسبة</label><input id="percentage-value" type="number" step="any" min="0" placeholder="15"></div><div class="form-field"><label for="percentage-base">الرقم الأساسي</label><input id="percentage-base" type="number" step="any" placeholder="200"></div><div class="action-row">${button('احسب النسبة', 'button-primary', 'submit')}</div></form>${result()}`; }
  function discountMarkup() { return `<form class="tool-form" id="discount-form"><div class="form-grid"><div class="form-field"><label for="discount-price">السعر الأصلي</label><input id="discount-price" type="number" min="0" step="any" required></div><div class="form-field"><label for="discount-rate">نسبة الخصم %</label><input id="discount-rate" type="number" min="0" max="100" step="any" required></div></div><div class="action-row">${button('احسب السعر بعد الخصم', 'button-primary', 'submit')}</div></form>${result()}`; }
  function vatMarkup() { return `<form class="tool-form" id="vat-form"><div class="form-grid"><div class="form-field"><label for="vat-amount">المبلغ</label><input id="vat-amount" type="number" min="0" step="any" required></div><div class="form-field"><label for="vat-rate">نسبة الضريبة %</label><input id="vat-rate" type="number" min="0" max="100" step="any" value="15" required></div></div><div class="form-field"><label for="vat-mode">العملية</label><select id="vat-mode"><option value="add">إضافة الضريبة إلى المبلغ</option><option value="extract">استخراج الضريبة من مبلغ شامل</option></select></div><div class="action-row">${button('احسب الضريبة', 'button-primary', 'submit')}</div></form>${result()}`; }
  function unitMarkup() { return `<form class="tool-form" id="unit-form"><div class="form-field"><label for="unit-type">نوع التحويل</label><select id="unit-type"><option value="length">الطول</option><option value="weight">الوزن</option><option value="temperature">الحرارة</option><option value="volume">الحجم</option></select></div><div class="form-grid"><div class="form-field"><label for="unit-value">القيمة</label><input id="unit-value" type="number" step="any" value="1" required></div><div class="form-field"><label for="unit-from">من</label><select id="unit-from"></select></div><div class="form-field"><label for="unit-to">إلى</label><select id="unit-to"></select></div></div><div class="action-row">${button('حوّل القيمة', 'button-primary', 'submit')}</div></form>${result()}`; }
  function numberWordsMarkup() { return `<form class="tool-form" id="number-words-form"><div class="form-field"><label for="number-input">الرقم الصحيح</label><input id="number-input" type="number" min="0" max="999999999" step="1" placeholder="1250" required></div><div class="action-row">${button('حوّل إلى كلمات', 'button-primary', 'submit')} ${button('نسخ النتيجة', 'button-quiet')}</div></form>${result()}`; }
  function bmiMarkup() { return `<form class="tool-form" id="bmi-form"><div class="form-grid"><div class="form-field"><label for="bmi-height">الطول بالسنتيمتر</label><input id="bmi-height" type="number" min="50" max="250" step="any" required></div><div class="form-field"><label for="bmi-weight">الوزن بالكيلوغرام</label><input id="bmi-weight" type="number" min="2" max="500" step="any" required></div></div><div class="action-row">${button('احسب BMI', 'button-primary', 'submit')}</div></form>${result()}`; }
  function passwordMarkup() { return `<div class="tool-form"><div class="form-field"><label for="password-length">طول كلمة المرور: <span id="password-length-value">16</span></label><input id="password-length" type="range" min="8" max="64" value="16"></div><div class="action-row"><label class="check-row"><input id="password-upper" type="checkbox" checked> أحرف كبيرة</label><label class="check-row"><input id="password-number" type="checkbox" checked> أرقام</label><label class="check-row"><input id="password-symbol" type="checkbox" checked> رموز</label></div>${button('إنشاء كلمة مرور', 'button-primary')} ${button('نسخ', 'button-quiet')}<div class="form-field"><label for="password-output">النتيجة</label><input id="password-output" type="text" readonly></div></div>`; }
  function jsonMarkup() { return `<div class="tool-form"><div class="form-field"><label for="json-input">JSON الأصلي</label><textarea id="json-input" placeholder='{"name":"محتوى"}'></textarea></div><div class="action-row">${button('تنسيق JSON', 'button-primary')} ${button('تصغير', 'button-quiet')} ${button('نسخ النتيجة', 'button-quiet')}</div><div class="form-field"><label for="json-output">النتيجة</label><textarea id="json-output" readonly></textarea></div></div>`; }

  function render() {
    const renderers = { 'age-calculator': ageMarkup, 'date-difference': dateDiffMarkup, 'hijri-converter': hijriMarkup, 'word-counter': wordMarkup, 'qr-code': qrMarkup, 'image-compressor': () => imageMarkup('compress'), 'image-resizer': () => imageMarkup('resize'), 'image-converter': () => imageMarkup('convert'), 'text-cleaner': cleanerMarkup, 'invoice-generator': invoiceMarkup, 'percentage-calculator': percentageMarkup, 'discount-calculator': discountMarkup, 'vat-calculator': vatMarkup, 'unit-converter': unitMarkup, 'number-to-words': numberWordsMarkup, 'bmi-calculator': bmiMarkup, 'password-generator': passwordMarkup, 'json-formatter': jsonMarkup };
    root.innerHTML = renderers[tool] ? renderers[tool]() : `<p>${error('الأداة غير متاحة حاليًا.')}</p>`;
    bind();
  }

  function bind() {
    if (tool === 'age-calculator') bindAge();
    if (tool === 'date-difference') bindDateDiff();
    if (tool === 'hijri-converter') bindHijri();
    if (tool === 'word-counter') bindWord();
    if (tool === 'qr-code') bindQr();
    if (['image-compressor', 'image-resizer', 'image-converter'].includes(tool)) bindImage(tool);
    if (tool === 'text-cleaner') bindCleaner();
    if (tool === 'invoice-generator') bindInvoice();
    if (tool === 'percentage-calculator') bindPercentage();
    if (tool === 'discount-calculator') bindDiscount();
    if (tool === 'vat-calculator') bindVat();
    if (tool === 'unit-converter') bindUnit();
    if (tool === 'number-to-words') bindNumberWords();
    if (tool === 'bmi-calculator') bindBmi();
    if (tool === 'password-generator') bindPassword();
    if (tool === 'json-formatter') bindJson();
  }

  function utcDate(year, month, day) { const date = new Date(0); date.setUTCHours(0, 0, 0, 0); date.setUTCFullYear(year, month, day); return date; }
  function daysInMonth(year, month) { return utcDate(year, month + 1, 0).getUTCDate(); }
  function parseIsoDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const year = Number(match[1]), month = Number(match[2]) - 1, day = Number(match[3]);
    const date = utcDate(year, month, day);
    return date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day ? date : null;
  }
  function addMonthsClamped(date, months) {
    const total = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
    const year = Math.floor(total / 12), month = total - year * 12;
    return utcDate(year, month, Math.min(date.getUTCDate(), daysInMonth(year, month)));
  }
  function calculateAgeParts(birthValue, endValue) {
    const birth = parseIsoDate(birthValue), end = parseIsoDate(endValue);
    if (!birth || !end || birth > end) return null;
    const birthYear = birth.getUTCFullYear(), birthMonth = birth.getUTCMonth(), birthDay = birth.getUTCDate();
    let years = end.getUTCFullYear() - birthYear;
    const anniversary = utcDate(end.getUTCFullYear(), birthMonth, Math.min(birthDay, daysInMonth(end.getUTCFullYear(), birthMonth)));
    if (end < anniversary) years -= 1;
    const lastBirthdayYear = birthYear + years;
    const lastBirthday = utcDate(lastBirthdayYear, birthMonth, Math.min(birthDay, daysInMonth(lastBirthdayYear, birthMonth)));
    let months = (end.getUTCFullYear() - lastBirthday.getUTCFullYear()) * 12 + end.getUTCMonth() - lastBirthday.getUTCMonth();
    let monthAnchor = addMonthsClamped(lastBirthday, months);
    if (monthAnchor > end) months -= 1;
    monthAnchor = addMonthsClamped(lastBirthday, months);
    const days = Math.round((end - monthAnchor) / 86400000);
    return { years, months, days };
  }
  function bindAge() {
    const form = $('#age-form'), box = $('#tool-result');
    form.addEventListener('submit', event => {
      event.preventDefault();
      const birth = $('#birth-date').value, end = $('#age-on').value;
      const parts = calculateAgeParts(birth, end);
      if (!parts) return showResult(box, error('اختر تاريخين صحيحين، ويجب أن يكون تاريخ الميلاد قبل تاريخ الحساب.'), true);
      showResult(box, `<div class="result-big">${parts.years} سنة، ${parts.months} شهر، ${parts.days} يوم</div><div class="result-muted">العمر التقريبي حتى ${esc(end)}</div>`);
    });
    form.addEventListener('reset', () => setTimeout(() => { box.textContent = ''; box.classList.remove('visible', 'error-message'); }, 0));
  }
  function bindDateDiff() { $('#diff-form').addEventListener('submit', event => { event.preventDefault(); const start = new Date(`${$('#date-start').value}T00:00:00`); const end = new Date(`${$('#date-end').value}T00:00:00`); const box = $('#tool-result'); if (!$('#date-start').value || !$('#date-end').value || start > end) return showResult(box, error('اختر تاريخ البداية قبل تاريخ النهاية.'), true); const days = Math.round((end - start) / 86400000); showResult(box, `<div class="result-big">${days.toLocaleString('ar-SA')} يوم</div><div class="result-muted">أي ما يعادل ${Math.floor(days / 7).toLocaleString('ar-SA')} أسبوعًا و${days % 7} يوم.</div>`); }); }
  function bindHijri() { $('#hijri-form').addEventListener('submit', event => { event.preventDefault(); const value = $('#gregorian-date').value; const box = $('#tool-result'); if (!value) return showResult(box, error('اختر تاريخًا صحيحًا.'), true); try { const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }); showResult(box, `<div class="result-big">${esc(formatter.format(new Date(`${value}T12:00:00`)))}</div><div class="result-muted">التاريخ الميلادي: ${esc(value)}</div>`); } catch { showResult(box, error('المتصفح لا يدعم تقويم أم القرى. جرّب متصفحًا حديثًا.'), true); } }); }
  function bindWord() { const input = $('#word-text'); const stats = $('#word-stats'); const update = () => { const text = input.value; const words = text.trim() ? text.trim().split(/\s+/u).length : 0; const lines = text ? text.split(/\r?\n/u).length : 0; stats.innerHTML = `<div class="tool-note"><strong>${words.toLocaleString('ar-SA')}</strong><br>كلمة</div><div class="tool-note"><strong>${text.length.toLocaleString('ar-SA')}</strong><br>حرف</div><div class="tool-note"><strong>${lines.toLocaleString('ar-SA')}</strong><br>سطر</div><div class="tool-note"><strong>${text.replace(/\s/g, '').length.toLocaleString('ar-SA')}</strong><br>حرف بدون مسافات</div>`; }; input.addEventListener('input', update); $('.button-quiet').addEventListener('click', () => copyText(input.value)); update(); }
  function bindQr() { const output = $('#qr-output'); const text = $('#qr-text'); const actions = $$('.action-row button'); actions[0].addEventListener('click', () => { if (!text.value.trim()) return output.innerHTML = error('اكتب نصًا أو رابطًا أولًا.'); if (!window.QRCode) return output.innerHTML = error('مكتبة QR لم تكتمل، أعد تحميل الصفحة.'); output.innerHTML = ''; new QRCode(output, { text: text.value.trim(), width: 210, height: 210, colorDark: '#102a43', colorLight: '#ffffff' }); }); actions[1].addEventListener('click', () => { const canvas = output.querySelector('canvas'); if (canvas) canvas.toBlob(blob => downloadBlob(blob, 'muhtawaa-qr.png')); }); }
  function bindImage(kind) {
    const input = $('#image-file'), preview = $('#image-preview'), options = $('#image-options'), actions = $('#image-actions');
    let image, fileName = 'muhtawaa-image';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      image = null;
      options.replaceChildren();
      actions.replaceChildren();
      if (!file) return;
      if (!file.type.startsWith('image/')) { preview.innerHTML = error('اختر ملف صورة صالحًا.'); return; }
      fileName = file.name.replace(/\.[^.]+$/, '') || fileName;
      try {
        image = await loadImage(await fileToDataURL(file));
      } catch {
        image = null;
        preview.innerHTML = error('تعذر تحميل الصورة. جرّب ملف صورة آخر بصيغة مدعومة.');
        return;
      }
      preview.innerHTML = `<img src="${esc(image.src)}" alt="معاينة الصورة">`;
      if (kind === 'image-compressor') options.innerHTML = `<div class="form-field"><label for="quality">الجودة: <span id="quality-value">80</span>%</label><div class="range-row"><input id="quality" type="range" min="20" max="100" value="80"><span class="result-muted">حجم أقل ←</span></div></div>`;
      if (kind === 'image-resizer') options.innerHTML = `<div class="form-grid"><div class="form-field"><label for="resize-width">العرض بالبكسل</label><input id="resize-width" type="number" min="1" value="${image.naturalWidth}"></div><div class="form-field"><label for="resize-height">الارتفاع بالبكسل</label><input id="resize-height" type="number" min="1" value="${image.naturalHeight}"></div></div><label class="check-row"><input id="keep-ratio" type="checkbox" checked> الحفاظ على النسبة</label>`;
      if (kind === 'image-converter') options.innerHTML = `<div class="form-field"><label for="image-format">الصيغة الناتجة</label><select id="image-format"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></div>`;
      actions.innerHTML = button('معالجة وتنزيل', 'button-primary');
      actions.querySelector('button').addEventListener('click', processImage);
      $('#quality')?.addEventListener('input', event => { $('#quality-value').textContent = event.target.value; });
      const syncRatio = changed => {
        if (!$('#keep-ratio')?.checked) return;
        const width = Number($('#resize-width').value), height = Number($('#resize-height').value);
        if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return;
        if (changed === 'width') $('#resize-height').value = Math.max(1, Math.round(width * image.naturalHeight / image.naturalWidth));
        else $('#resize-width').value = Math.max(1, Math.round(height * image.naturalWidth / image.naturalHeight));
      };
      $('#resize-width')?.addEventListener('input', () => syncRatio('width'));
      $('#resize-height')?.addEventListener('input', () => syncRatio('height'));
    });
    function processImage() {
      if (!image) return;
      let width = image.naturalWidth, height = image.naturalHeight, type = 'image/jpeg', quality = 0.8;
      if (kind === 'image-compressor') quality = Number($('#quality').value) / 100;
      if (kind === 'image-resizer') {
        width = Number($('#resize-width').value);
        height = Number($('#resize-height').value);
        if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 10000 || height > 10000) {
          preview.insertAdjacentHTML('beforeend', error('أدخل أبعادًا صحيحة بين 1 و10000 بكسل.'));
          return;
        }
      }
      if (kind === 'image-converter') type = $('#image-format').value;
      if (width * height > 40000000) { preview.insertAdjacentHTML('beforeend', error('أبعاد الصورة كبيرة جدًا للمعالجة في المتصفح.'));
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) { preview.insertAdjacentHTML('beforeend', error('تعذر بدء معالجة الصورة في هذا المتصفح.')); return; }
      if (type === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height); }
      context.drawImage(image, 0, 0, width, height);
      try {
        canvas.toBlob(blob => {
          if (!blob) { preview.insertAdjacentHTML('beforeend', error('تعذر إنشاء الملف الناتج. جرّب إعدادات أخرى.')); return; }
          const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
          downloadBlob(blob, `${fileName}-muhtawaa.${ext}`);
        }, type, quality);
      } catch {
        preview.insertAdjacentHTML('beforeend', error('حدث خطأ أثناء معالجة الصورة. جرّب صورة أخرى.'));
      }
    }
  }
  function bindCleaner() { const original = $('#dirty-text'); const cleaned = $('#clean-text'); $('.button-primary').addEventListener('click', () => { let value = original.value; if ($('#trim-spaces').checked) value = value.split(/\r?\n/u).map(line => line.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n'); if ($('#remove-duplicates').checked) { const seen = new Set(); value = value.split(/\r?\n/u).filter(line => { if (!line || seen.has(line)) return false; seen.add(line); return true; }).join('\n'); } cleaned.value = value; }); $('.button-quiet')?.addEventListener('click', () => copyText(cleaned.value)); }
  function bindInvoice() { const items = $('#invoice-items'); const addItem = () => { const row = document.createElement('div'); row.className = 'form-grid invoice-item'; row.innerHTML = `<div class="form-field"><label>البند</label><input class="item-name" placeholder="اسم المنتج أو الخدمة"></div><div class="form-field"><label>الكمية × السعر</label><div class="form-grid"><input class="item-qty" type="number" min="0" value="1"><input class="item-price" type="number" min="0" step="0.01" value="0"></div></div>`; items.appendChild(row); }; addItem(); const refresh = () => { const business = esc($('#invoice-business').value || 'اسم النشاط'); const client = esc($('#invoice-client').value || '—'); const number = esc($('#invoice-number').value || '—'); const date = esc($('#invoice-date').value || '—'); let total = 0; const rows = $$('.invoice-item', items).map(row => { const name = esc($('.item-name', row).value || 'بند'); const qty = Number($('.item-qty', row).value) || 0; const price = Number($('.item-price', row).value) || 0; total += qty * price; return `<tr><td>${name}</td><td>${qty}</td><td>${price.toFixed(2)}</td><td>${(qty * price).toFixed(2)}</td></tr>`; }).join(''); $('#invoice-preview').innerHTML = `<div class="invoice-head"><div><strong>${business}</strong><br><span class="result-muted">العميل: ${client}</span></div><div><strong>فاتورة</strong><br><span class="result-muted">${number} · ${date}</span></div></div><table class="invoice-table"><thead><tr><th>البند</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table><div class="invoice-total">الإجمالي: ${total.toFixed(2)}</div>`; }; const buttons = $$('.action-row button'); buttons[0].addEventListener('click', addItem); buttons[1].addEventListener('click', refresh); buttons[2].addEventListener('click', () => { refresh(); window.print(); }); refresh(); }

  function bindPercentage() { $('#percentage-form').addEventListener('submit', event => { event.preventDefault(); const percent = numberValue('#percentage-value'); const base = numberValue('#percentage-base'); const box = $('#tool-result'); if (!validNumber(percent) || !validNumber(base) || percent < 0) return showResult(box, error('أدخل نسبة ورقمًا صحيحين.'), true); showResult(box, `<div class="result-big">${(base * percent / 100).toLocaleString('ar-SA')}</div><div class="result-muted">${percent}% من ${base}</div>`); }); }
  function bindDiscount() { $('#discount-form').addEventListener('submit', event => { event.preventDefault(); const price = numberValue('#discount-price'); const rate = numberValue('#discount-rate'); const box = $('#tool-result'); if (!validNumber(price) || !validNumber(rate) || price < 0 || rate < 0 || rate > 100) return showResult(box, error('أدخل سعرًا صحيحًا ونسبة بين 0 و100.'), true); const saving = price * rate / 100; showResult(box, `<div class="result-big">السعر النهائي: ${(price - saving).toFixed(2)}</div><div class="result-muted">قيمة التوفير: ${saving.toFixed(2)}</div>`); }); }
  function bindVat() { $('#vat-form').addEventListener('submit', event => { event.preventDefault(); const amount = numberValue('#vat-amount'); const rate = numberValue('#vat-rate'); const box = $('#tool-result'); if (!validNumber(amount) || !validNumber(rate) || amount < 0 || rate < 0 || rate > 100) return showResult(box, error('أدخل مبلغًا صحيحًا ونسبة بين 0 و100.'), true); const mode = $('#vat-mode').value; const vat = mode === 'add' ? amount * rate / 100 : amount * rate / (100 + rate); const total = mode === 'add' ? amount + vat : amount; showResult(box, `<div class="result-big">الضريبة: ${vat.toFixed(2)}</div><div class="result-muted">${mode === 'add' ? 'المبلغ شامل الضريبة' : 'المبلغ قبل الضريبة'}: ${(mode === 'add' ? total : amount - vat).toFixed(2)}</div>`); }); }

  const unitSets = { length: { meter: ['متر', 1], kilometer: ['كيلومتر', 1000], centimeter: ['سنتيمتر', 0.01], foot: ['قدم', 0.3048], inch: ['بوصة', 0.0254] }, weight: { kilogram: ['كيلوغرام', 1], gram: ['غرام', 0.001], pound: ['رطل', 0.45359237], ounce: ['أونصة', 0.0283495] }, volume: { liter: ['لتر', 1], milliliter: ['ملليلتر', 0.001], gallon: ['غالون', 3.785411784], cup: ['كوب', 0.2365882365] }, temperature: { celsius: ['مئوية', 'c'], fahrenheit: ['فهرنهايت', 'f'], kelvin: ['كلفن', 'k'] } };
  function bindUnit() { const type = $('#unit-type'); const from = $('#unit-from'); const to = $('#unit-to'); const refresh = () => { const set = unitSets[type.value]; const options = Object.entries(set).map(([key, value]) => `<option value="${key}">${value[0]}</option>`).join(''); from.innerHTML = options; to.innerHTML = options; if (Object.keys(set).length > 1) to.selectedIndex = 1; }; type.addEventListener('change', refresh); $('#unit-form').addEventListener('submit', event => { event.preventDefault(); const value = numberValue('#unit-value'); const set = unitSets[type.value]; const box = $('#tool-result'); if (!validNumber(value)) return showResult(box, error('أدخل قيمة صحيحة.'), true); let converted; if (type.value === 'temperature') { const celsius = from.value === 'celsius' ? value : from.value === 'fahrenheit' ? (value - 32) * 5 / 9 : value - 273.15; converted = to.value === 'celsius' ? celsius : to.value === 'fahrenheit' ? celsius * 9 / 5 + 32 : celsius + 273.15; } else converted = value * set[from.value][1] / set[to.value][1]; showResult(box, `<div class="result-big">${converted.toLocaleString('ar-SA', { maximumFractionDigits: 6 })} ${esc(set[to.value][0])}</div>`); }); refresh(); }

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  function threeWords(value) { const parts = []; const hundred = Math.floor(value / 100); const rest = value % 100; if (hundred) parts.push(hundreds[hundred]); if (rest) { if (rest < 10) parts.push(ones[rest]); else if (rest < 20) parts.push(teens[rest - 10]); else { const unit = rest % 10; const ten = Math.floor(rest / 10); parts.push(unit ? `${ones[unit]} و${tens[ten]}` : tens[ten]); } } return parts.join(' و'); }
  function numberWords(value) { if (value === 0) return 'صفر'; if (value > 999999999) return ''; const groups = [[1000000, 'مليون', 'مليونان', 'ملايين'], [1000, 'ألف', 'ألفان', 'آلاف']]; let rest = value; const parts = []; for (const [factor, singular, dual, plural] of groups) { const count = Math.floor(rest / factor); if (count) parts.push(count === 1 ? singular : count === 2 ? dual : `${threeWords(count)} ${count < 11 ? plural : singular}`); rest %= factor; } if (rest) parts.push(threeWords(rest)); return parts.join(' و'); }
  function bindNumberWords() { const form = $('#number-words-form'); const box = $('#tool-result'); form.addEventListener('submit', event => { event.preventDefault(); const value = Number($('#number-input').value); if (!Number.isInteger(value) || value < 0 || value > 999999999) return showResult(box, error('أدخل عددًا صحيحًا بين صفر و999,999,999.'), true); showResult(box, `<div class="result-big">${esc(numberWords(value))}</div>`); }); $('.button-quiet').addEventListener('click', () => copyText(box.textContent)); }
  function bindBmi() { $('#bmi-form').addEventListener('submit', event => { event.preventDefault(); const height = numberValue('#bmi-height') / 100; const weight = numberValue('#bmi-weight'); const box = $('#tool-result'); if (!validNumber(height) || !validNumber(weight) || height <= 0 || weight <= 0) return showResult(box, error('أدخل الطول والوزن بشكل صحيح.'), true); const bmi = weight / (height * height); const label = bmi < 18.5 ? 'نقص في الوزن' : bmi < 25 ? 'ضمن النطاق المعتاد' : bmi < 30 ? 'زيادة في الوزن' : 'سمنة'; showResult(box, `<div class="result-big">${bmi.toFixed(1)}</div><div class="result-muted">التصنيف التقريبي: ${label}. هذه النتيجة إرشادية وليست تشخيصًا طبيًا.</div>`); }); }
  function secureRandomIndex(length) {
    if (!Number.isInteger(length) || length < 1) throw new RangeError('length must be a positive integer');
    const limit = Math.floor(0x100000000 / length) * length;
    const buffer = new Uint32Array(1);
    let value;
    do {
      crypto.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);
    return value % length;
  }
  function bindPassword() {
    const length = $('#password-length'), output = $('#password-output');
    $('#password-length-value').textContent = length.value;
    length.addEventListener('input', () => { $('#password-length-value').textContent = length.value; });
    const generate = () => {
      let chars = 'abcdefghijklmnopqrstuvwxyz';
      if ($('#password-upper').checked) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if ($('#password-number').checked) chars += '0123456789';
      if ($('#password-symbol').checked) chars += '!@#$%^&*()-_=+';
      output.value = Array.from({ length: Number(length.value) }, () => chars[secureRandomIndex(chars.length)]).join('');
    };
    $('.button-primary').addEventListener('click', generate);
    $('.button-quiet').addEventListener('click', () => copyText(output.value));
    generate();
  }
  function bindJson() { const input = $('#json-input'); const output = $('#json-output'); const buttons = $$('.action-row button'); const transform = compact => { try { const value = JSON.parse(input.value); output.value = JSON.stringify(value, null, compact ? 0 : 2); output.classList.remove('error-message'); } catch (exception) { output.value = `خطأ في JSON: ${exception.message}`; output.classList.add('error-message'); } }; buttons[0].addEventListener('click', () => transform(false)); buttons[1].addEventListener('click', () => transform(true)); buttons[2].addEventListener('click', () => copyText(output.value)); }

  render();
})();
