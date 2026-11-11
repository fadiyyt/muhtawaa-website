# محتوى أدوات

منصة أدوات عربية مجانية مبنية كـ static site وتُنشر من مستودع GitHub إلى Cloudflare Pages. كل أداة لها صفحة HTML مستقلة قابلة للفهرسة، وتعمل وظائف النسخة الأولى من داخل المتصفح.

## التشغيل المحلي

```bash
python3 scripts/build_pages.py
python3 scripts/validate_site.py
node scripts/test_tool_algorithms.js
python3 -m http.server 8000
```

ثم افتح `http://localhost:8000`.

## إضافة أداة جديدة

1. أضف كائن الأداة إلى `data/tools.json` مع `slug` و`name` و`description` وبيانات SEO والأسئلة الشائعة، ثم أضف `summary` و`usageHint` و`howTo` و`examples` و`notes` بمحتوى خاص بالأداة.
2. أضف دالة واجهة في `assets/js/tool-app.js` واربطها بالـ `slug`.
3. شغل `python3 scripts/build_pages.py` لتوليد صفحة HTML وخريطة الموقع ومسارات Manus. المولد يضع الإرشادات والأمثلة داخل HTML قبل تشغيل JavaScript.
4. شغل `python3 scripts/validate_site.py`.
5. راجع الصفحة محليًا، ثم نفذ commit وpush إلى `main`.

## المجلدات المهمة

- `data/tools.json`: المصدر المركزي لكتالوج الأدوات.
- `scripts/build_pages.py`: مولد الصفحات وخريطة الموقع.
- `scripts/validate_site.py`: فحص الروابط والصفحات والبيانات.
- `tools/`: صفحات HTML الناتجة، وتُرفع إلى الموقع لتكون قابلة للفهرسة.
- `assets/js/tool-app.js`: منطق الأدوات التفاعلية.
- `assets/css/site.css`: التصميم المتجاوب.

لا تضع مفاتيح API أو بيانات دخول في المستودع. قبل كل نشر يجب تشغيل المولد والفاحص.
