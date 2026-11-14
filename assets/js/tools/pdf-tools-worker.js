'use strict';

importScripts('/assets/vendor/pdf-lib.min.js');

const { PDFDocument, degrees } = PDFLib;
const MAX_PAGES = 300;
const MAX_SPLIT_OUTPUTS = 50;

function safeBaseName(name) {
  return String(name || 'document').replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9\u0600-\u06FF_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'document';
}

function latinDigits(value) {
  return String(value).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

async function openPdf(file) {
  try {
    const bytes = file.buffer instanceof ArrayBuffer ? new Uint8Array(file.buffer) : new Uint8Array(file.buffer.buffer);
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false });
    if (!pdf.getPageCount()) throw new Error('ملف PDF لا يحتوي على صفحات.');
    if (pdf.getPageCount() > MAX_PAGES) throw new Error('الحد الأقصى 300 صفحة للملف الواحد.');
    return pdf;
  } catch (error) {
    if (error instanceof Error && /300 صفحة|لا يحتوي على صفحات/.test(error.message)) throw error;
    throw new Error('تعذر فتح ملف PDF؛ تحقق من صلاحيته وأنه غير محمي بكلمة مرور.');
  }
}

function bytesToTransferable(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function saveOutput(pdf, name) {
  const bytes = await pdf.save();
  return { name, type: 'application/pdf', buffer: bytesToTransferable(bytes) };
}

async function mergePdfs(files) {
  if (files.length < 2) throw new Error('اختر ملفي PDF على الأقل للدمج.');
  const output = await PDFDocument.create();
  let totalPages = 0;
  for (const file of files) {
    const source = await openPdf(file);
    totalPages += source.getPageCount();
    if (totalPages > MAX_PAGES) throw new Error('الحد الأقصى 300 صفحة للناتج الواحد.');
    const pages = await output.copyPages(source, source.getPageIndices());
    pages.forEach(page => output.addPage(page));
  }
  return [await saveOutput(output, `${safeBaseName(files[0].name)}-merged.pdf`)];
}

function parseSplitGroups(expression, pageCount) {
  const chunks = latinDigits(expression || '').split(/[\n,،;]+/).map(part => part.trim()).filter(Boolean);
  if (!chunks.length) throw new Error('أدخل أرقام الصفحات أو نطاقاتها أولًا.');
  if (chunks.length > MAX_SPLIT_OUTPUTS) throw new Error('الحد الأقصى 50 ملفًا ناتجًا في العملية الواحدة.');
  const seen = new Set();
  return chunks.map(chunk => {
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(chunk);
    if (!match) throw new Error(`صيغة الصفحات غير صحيحة: ${chunk}`);
    const first = Number(match[1]);
    const last = Number(match[2] || match[1]);
    if (first < 1 || last < first || last > pageCount) throw new Error(`النطاق ${chunk} خارج صفحات الملف؛ عدد الصفحات ${pageCount}.`);
    const group = [];
    for (let page = first; page <= last; page += 1) {
      if (seen.has(page)) throw new Error(`الصفحة ${page} مكررة في النطاقات.`);
      seen.add(page);
      group.push(page - 1);
    }
    return { label: first === last ? String(first) : `${first}-${last}`, indices: group };
  });
}

async function splitPdf(file, expression) {
  const source = await openPdf(file);
  const groups = parseSplitGroups(expression, source.getPageCount());
  const base = safeBaseName(file.name);
  const outputs = [];
  for (let i = 0; i < groups.length; i += 1) {
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, groups[i].indices);
    pages.forEach(page => output.addPage(page));
    outputs.push(await saveOutput(output, `${base}-pages-${groups[i].label}.pdf`));
  }
  return outputs;
}

async function imagesToPdf(files) {
  if (!files.length) throw new Error('اختر صورة PNG أو JPEG واحدة على الأقل.');
  if (files.length > MAX_PAGES) throw new Error('الحد الأقصى 300 صورة في العملية الواحدة.');
  const output = await PDFDocument.create();
  const pageWidth = 595.28, pageHeight = 841.89, margin = 24;
  for (const file of files) {
    const extension = String(file.name || '').split('.').pop().toLowerCase();
    const type = String(file.type || '').toLowerCase();
    const bytes = file.buffer instanceof ArrayBuffer ? new Uint8Array(file.buffer) : new Uint8Array(file.buffer.buffer);
    let image;
    try {
      if (type === 'image/png' || extension === 'png') image = await output.embedPng(bytes);
      else if (type === 'image/jpeg' || extension === 'jpg' || extension === 'jpeg') image = await output.embedJpg(bytes);
      else throw new Error('تدعم الأداة PNG وJPG/JPEG فقط.');
    } catch (error) {
      if (error instanceof Error && /تدعم الأداة/.test(error.message)) throw error;
      throw new Error(`تعذر قراءة الصورة ${safeBaseName(file.name)}؛ اختر PNG أو JPEG صالحًا.`);
    }
    const scale = Math.min((pageWidth - margin * 2) / image.width, (pageHeight - margin * 2) / image.height);
    const width = image.width * scale, height = image.height * scale;
    const page = output.addPage([pageWidth, pageHeight]);
    page.drawImage(image, { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height });
  }
  return [await saveOutput(output, 'images-to-pdf.pdf')];
}

function parseOrder(expression, pageCount) {
  if (!String(expression || '').trim()) return Array.from({ length: pageCount }, (_, index) => index);
  const numbers = latinDigits(expression).split(/[\s,،;]+/).filter(Boolean).map(Number);
  if (numbers.length !== pageCount || numbers.some(number => !Number.isInteger(number) || number < 1 || number > pageCount)) {
    throw new Error(`أدخل جميع الصفحات من 1 إلى ${pageCount} مرة واحدة، أو اترك الحقل فارغًا.`);
  }
  if (new Set(numbers).size !== pageCount) throw new Error('ترتيب الصفحات يحتوي رقمًا مكررًا؛ يجب إدراج كل صفحة مرة واحدة.');
  return numbers.map(number => number - 1);
}

async function organizePdf(file, orderExpression, rotationValue) {
  const source = await openPdf(file);
  const order = parseOrder(orderExpression, source.getPageCount());
  const rotation = Number(rotationValue);
  if (![0, 90, 180, 270].includes(rotation)) throw new Error('اختر زاوية تدوير 0 أو 90 أو 180 أو 270 درجة.');
  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, order);
  for (const page of pages) {
    if (rotation) page.setRotation(degrees(((page.getRotation().angle || 0) + rotation) % 360));
    output.addPage(page);
  }
  return [await saveOutput(output, `${safeBaseName(file.name)}-organized.pdf`)];
}

async function run(message) {
  const files = message.files || [];
  if (message.action === 'merge') return mergePdfs(files);
  if (message.action === 'split') return splitPdf(files[0], message.ranges);
  if (message.action === 'images-to-pdf') return imagesToPdf(files);
  if (message.action === 'organize') return organizePdf(files[0], message.order, message.rotation);
  throw new Error('نوع المعالجة غير معروف.');
}

self.addEventListener('message', async event => {
  const message = event.data || {};
  try {
    const files = await run(message);
    const transfers = files.map(file => file.buffer);
    self.postMessage({ requestId: message.requestId, ok: true, files }, transfers);
  } catch (error) {
    self.postMessage({ requestId: message.requestId, ok: false, error: error instanceof Error ? error.message : 'تعذرت معالجة الملف. تحقق من صيغته وحجمه.' });
  }
});
