const CACHE_NAME = 'muhtawaa-tools-v10';
const CORE = [
  '/', '/tools.html', '/categories/documents.html', '/categories/converters.html',
  '/tools/age-calculator', '/tools/hijri-converter', '/tools/hijri-calendar',
  '/tools/end-of-service-calculator', '/tools/zakat-calculator',
  '/tools/pdf-merge', '/tools/pdf-split', '/tools/images-to-pdf', '/tools/pdf-organizer',
  '/tools/length-converter', '/tools/weight-converter', '/tools/temperature-converter', '/tools/area-converter', '/tools/volume-converter', '/tools/speed-converter', '/tools/pressure-converter', '/tools/energy-converter', '/tools/data-size-converter', '/tools/time-unit-converter',
  '/tools/percentage-adjustment', '/tools/percent-of-number', '/tools/percentage-difference', '/tools/average-calculator', '/tools/ratio-proportion-calculator', '/tools/gcd-lcm-calculator', '/tools/simple-interest-calculator', '/tools/compound-interest-calculator',
  '/tools/character-counter', '/tools/case-converter', '/tools/arabic-diacritics-remover', '/tools/duplicate-spaces-remover', '/tools/reverse-text', '/tools/alphabetize-list', '/tools/text-compare',
  '/tools/date-offset-calculator', '/tools/business-days-calculator', '/tools/iso-week-calculator', '/tools/date-countdown', '/tools/hijri-days-difference',
  '/data/ummalqura-1356-1500.json',
  '/assets/css/site.css', '/assets/js/site.js', '/assets/js/tool-app.js',
  '/assets/js/tools/hijri-tools.js', '/assets/js/tools/end-of-service-calculator.js', '/assets/js/tools/zakat-calculator.js',
  '/assets/js/tools/pdf-tools.js', '/assets/js/tools/pdf-tools-worker.js',
  '/assets/js/tools/converter-family.js', '/assets/js/tools/math-family.js', '/assets/js/tools/text-family.js', '/assets/js/tools/date-family.js',
  '/assets/vendor/pdf-lib.min.js', '/assets/vendor/pdf-lib-LICENSE.md',
  '/assets/fonts/Cairo-Arabic.woff2', '/assets/fonts/Cairo-Latin.woff2', '/assets/fonts/Cairo-Latin-Ext.woff2',
  '/assets/images/og/site.png', '/favicon.svg', '/og-image.svg'
];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => { if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return; event.respondWith(fetch(event.request).then(response => { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)); return response; }).catch(() => caches.match(event.request))); });
