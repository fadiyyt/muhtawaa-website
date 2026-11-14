(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.MuhtawaaSaudiTools = root.MuhtawaaSaudiTools || {};
    for (const slug of ['pdf-merge', 'pdf-split', 'images-to-pdf', 'pdf-organizer']) root.MuhtawaaSaudiTools[slug] = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_BYTES = 25 * 1024 * 1024;
  const MAX_BYTES_AR = '25 ميغابايت';

  const configs = {
    'pdf-merge': {
      title: 'دمج ملفات PDF', action: 'merge', accept: 'application/pdf,.pdf', multiple: true,
      help: 'اختر ملفي PDF أو أكثر؛ سيحافظ الناتج على ترتيب الاختيار.', button: 'ابدأ الدمج',
      minimum: 2, kinds: 'pdf'
    },
    'pdf-split': {
      title: 'تقسيم ملف PDF', action: 'split', accept: 'application/pdf,.pdf', multiple: false,
      help: 'كل رقم أو نطاق مفصول بفاصلة ينتج ملفًا مستقلًا؛ مثال: 1-2, 4, 6-8.', button: 'قسّم الملف',
      minimum: 1, kinds: 'pdf', extra: '<div class="form-field"><label for="pdf-ranges">الصفحات أو النطاقات</label><input id="pdf-ranges" type="text" inputmode="text" placeholder="1-2, 4, 6-8" required><small>ابدأ ترقيم الصفحات من 1. الحد 50 ملفًا ناتجًا في العملية.</small></div>'
    },
    'images-to-pdf': {
      title: 'تحويل الصور إلى PDF', action: 'images-to-pdf', accept: 'image/png,image/jpeg,.png,.jpg,.jpeg', multiple: true,
      help: 'الصيغ المدعومة PNG وJPG/JPEG؛ كل صورة تصبح صفحة A4.', button: 'حوّل إلى PDF',
      minimum: 1, kinds: 'images'
    },
    'pdf-organizer': {
      title: 'ترتيب وتدوير صفحات PDF', action: 'organize', accept: 'application/pdf,.pdf', multiple: false,
      help: 'اختياريًا أدخل ترتيب كل الصفحات مرة واحدة؛ يطبق التدوير المختار على جميع الصفحات.', button: 'طبّق الترتيب والتدوير',
      minimum: 1, kinds: 'pdf', extra: '<div class="form-grid"><div class="form-field"><label for="pdf-order">ترتيب الصفحات (اختياري)</label><input id="pdf-order" type="text" placeholder="3,1,2"><small>أدخل كل رقم صفحة مرة واحدة؛ اتركه فارغًا لحفظ الترتيب الحالي.</small></div><div class="form-field"><label for="pdf-rotation">تدوير جميع الصفحات</label><select id="pdf-rotation"><option value="0">بدون تغيير</option><option value="90">90 درجة</option><option value="180">180 درجة</option><option value="270">270 درجة</option></select></div></div>'
    }
  };

  function mount(rootElement) {
    const slug = rootElement.dataset.tool;
    const config = configs[slug];
    if (!config) return;

    rootElement.innerHTML = `
      <form class="tool-form" id="pdf-local-form">
        <div class="form-field">
          <label for="pdf-input">${config.title}</label>
          <input id="pdf-input" class="file-input" type="file" accept="${config.accept}" ${config.multiple ? 'multiple' : ''} required>
          <small>${config.help}</small>
        </div>
        ${config.extra || ''}
        <p class="tool-note">تتم المعالجة على جهازك داخل Web Worker. لا ترفع الأداة الملفات. الحد الإجمالي ${MAX_BYTES_AR} و300 صفحة كحد أقصى للعملية.</p>
        <div class="action-row"><button class="button-primary" id="pdf-run" type="submit">${config.button}</button><button class="button-quiet" type="reset">مسح</button></div>
        <div class="result-box" id="pdf-result" aria-live="polite"></div>
      </form>`;

    const form = rootElement.querySelector('#pdf-local-form');
    const fileInput = rootElement.querySelector('#pdf-input');
    const result = rootElement.querySelector('#pdf-result');
    const button = rootElement.querySelector('#pdf-run');
    let objectUrls = [];

    function clearResult() {
      for (const url of objectUrls) URL.revokeObjectURL(url);
      objectUrls = [];
      result.replaceChildren();
      result.classList.remove('visible', 'error-message');
    }

    function showMessage(message, isError) {
      clearResult();
      result.textContent = message;
      result.classList.add('visible');
      result.classList.toggle('error-message', Boolean(isError));
    }

    function getFiles() {
      const files = [...fileInput.files];
      if (files.length < config.minimum) throw new Error(config.action === 'merge' ? 'اختر ملفي PDF على الأقل.' : 'اختر ملفًا واحدًا على الأقل.');
      const total = files.reduce((sum, file) => sum + file.size, 0);
      if (files.some(file => !file.size) || total > MAX_BYTES) throw new Error(`الحد الأقصى للحجم الإجمالي ${MAX_BYTES_AR}. اختر ملفات أصغر أو قسّم العمل.`);
      if (config.kinds === 'pdf' && files.some(file => !/\.pdf$/i.test(file.name) && file.type !== 'application/pdf')) {
        throw new Error('اختر ملفات PDF صالحة فقط.');
      }
      if (config.kinds === 'images' && files.some(file => {
        const type = String(file.type || '').toLowerCase();
        const ext = file.name.split('.').pop().toLowerCase();
        return !['image/png', 'image/jpeg'].includes(type) && !['png', 'jpg', 'jpeg'].includes(ext);
      })) throw new Error('تدعم الأداة صور PNG وJPG/JPEG فقط.');
      return files;
    }

    function showFiles(files) {
      clearResult();
      const lead = document.createElement('p');
      lead.textContent = files.length === 1 ? 'اكتملت المعالجة محليًا. نزّل الملف الناتج:' : `اكتملت المعالجة محليًا. ${files.length} ملفات جاهزة للتنزيل:`;
      result.append(lead);
      const list = document.createElement('ul');
      for (const file of files) {
        const url = URL.createObjectURL(new Blob([file.buffer], { type: file.type || 'application/pdf' }));
        objectUrls.push(url);
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.textContent = `تنزيل ${file.name}`;
        item.append(link);
        list.append(item);
      }
      result.append(list);
      result.classList.add('visible');
      result.classList.remove('error-message');
    }

    form.addEventListener('reset', () => setTimeout(clearResult, 0));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      clearResult();
      let files;
      try { files = getFiles(); } catch (error) { showMessage(error.message, true); return; }
      button.disabled = true;
      showMessage('جارٍ معالجة الملفات محليًا… لا تغلق الصفحة حتى يكتمل التنزيل.', false);
      let worker;
      try {
        const buffers = await Promise.all(files.map(file => file.arrayBuffer()));
        const payload = {
          requestId: `${Date.now()}-${Math.random()}`,
          action: config.action,
          files: files.map((file, index) => ({ name: file.name, type: file.type, buffer: buffers[index] })),
          ranges: rootElement.querySelector('#pdf-ranges')?.value || '',
          order: rootElement.querySelector('#pdf-order')?.value || '',
          rotation: rootElement.querySelector('#pdf-rotation')?.value || '0'
        };
        const transfers = buffers;
        const response = await new Promise((resolve, reject) => {
          worker = new Worker('/assets/js/tools/pdf-tools-worker.js');
          worker.onmessage = event => event.data?.requestId === payload.requestId ? resolve(event.data) : null;
          worker.onerror = () => reject(new Error('تعذر تشغيل عامل المعالجة المحلي؛ حدّث الصفحة وحاول مرة أخرى.'));
          worker.postMessage(payload, transfers);
        });
        if (!response.ok) throw new Error(response.error || 'تعذرت معالجة الملف.');
        showFiles(response.files || []);
      } catch (error) {
        showMessage(error instanceof Error ? error.message : 'تعذرت معالجة الملفات. تحقق من صيغتها وحجمها.', true);
      } finally {
        worker?.terminate();
        button.disabled = false;
      }
    });
  }

  return { mount };
});
