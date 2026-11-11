#!/usr/bin/env python3
"""Generate index, catalog, tool pages, sitemap and route manifest from data/tools.json."""
from html import escape
from pathlib import Path
import json
import subprocess
from datetime import date

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data' / 'tools.json'
ASSET_VERSION = '20261111-3'
SITE_URL = 'https://muhtawaa.com'


def load_data():
    return json.loads(DATA.read_text(encoding='utf-8'))


def lastmod_for(url):
    """Return the latest committed source date for a generated route."""
    if url == '/':
        sources = ['scripts/build_pages.py', 'data/tools.json']
    elif url == '/tools':
        sources = ['scripts/build_pages.py', 'data/tools.json']
    elif url.startswith('/tools/'):
        sources = ['scripts/build_pages.py', 'data/tools.json']
    elif url.startswith('/categories/'):
        sources = ['scripts/build_pages.py', 'data/tools.json']
    else:
        sources = [url.lstrip('/').replace('/', '/')] if url != '/' else ['index.html']
    dates = []
    for source in sources:
        try:
            result = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', source], cwd=ROOT, capture_output=True, text=True, check=False)
            if result.stdout.strip():
                dates.append(result.stdout.strip())
        except OSError:
            pass
    if dates:
        return max(dates)
    # Fallback for environments without Git history.
    candidates = [ROOT / source for source in sources if (ROOT / source).exists()]
    timestamps = [Path(path).stat().st_mtime for path in candidates]
    return date.fromtimestamp(max(timestamps)).isoformat() if timestamps else date.today().isoformat()


def jsonld(value):
    return f'<script type="application/ld+json">{json.dumps(value, ensure_ascii=False, separators=(",", ":"))}</script>'


def head(title, description, canonical, extra=''):
    url = f'{SITE_URL}{canonical}'
    return f'''<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="{url}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ar_AR">
  <meta property="og:site_name" content="محتوى أدوات">
  <meta property="og:title" content="{escape(title)}">
  <meta property="og:description" content="{escape(description)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="https://muhtawaa.com/og-image.svg">
  <meta property="og:image:alt" content="محتوى أدوات — أدوات عربية مجانية">
  <meta property="og:image:type" content="image/svg+xml">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@muhtawaa_com">
  <meta name="twitter:title" content="{escape(title)}">
  <meta name="twitter:description" content="{escape(description)}">
  <meta name="twitter:image" content="https://muhtawaa.com/og-image.svg">
  <meta name="twitter:image:alt" content="محتوى أدوات — أدوات عربية مجانية">
  <meta name="theme-color" content="#18a673">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/site.css?v={ASSET_VERSION}">
  {extra}
</head>'''


def header(active='tools'):
    return f'''<a class="skip-link" href="#main">انتقل إلى المحتوى</a>
<header class="site-header"><div class="container navbar">
  <a class="brand" href="/"><span class="brand-mark" aria-hidden="true">✦</span><span>محتوى أدوات</span></a>
  <nav class="nav-links" aria-label="التنقل الرئيسي">
    <a href="/" {'aria-current="page"' if active == 'home' else ''}>الرئيسية</a>
    <a href="/tools" {'aria-current="page"' if active == 'tools' else ''}>كل الأدوات</a>
    <a href="/about" {'aria-current="page"' if active == 'about' else ''}>عن المنصة</a>
    <a class="nav-cta" href="/tools">ابدأ الآن</a>
  </nav>
</div></header>'''


def footer():
    return '''<footer class="site-footer"><div class="container footer-grid">
  <div><a class="brand" href="/"><span class="brand-mark" aria-hidden="true">✦</span><span>محتوى أدوات</span></a><p>أدوات عربية مجانية تنجز المهمة بسرعة ووضوح، مع احترام خصوصية ملفاتك ونصوصك.</p></div>
  <div><h3>استكشف</h3><div class="footer-links"><a href="/tools">كل الأدوات</a><a href="/about">عن المنصة</a><a href="/contact">تواصل معنا</a></div></div>
  <div><h3>معلومات</h3><div class="footer-links"><a href="/privacy">الخصوصية</a><a href="/sitemap.xml">خريطة الموقع</a><a href="/robots.txt">robots.txt</a></div></div>
</div><div class="container copyright">© 2026 محتوى أدوات — مشروع عربي يتوسع بأدوات عملية.</div></footer>'''


def card(tool):
    return f'''<a class="tool-card" href="/tools/{escape(tool['slug'])}"><div><div class="tool-card-top"><span class="tool-icon" aria-hidden="true">{escape(tool['icon'])}</span><span class="category-pill">{escape(category_name(tool['category']))}</span></div><h3>{escape(tool['name'])}</h3><p>{escape(tool['description'])}</p></div><span class="tool-card-link">استخدم الأداة ←</span></a>'''


def category_name(slug):
    return {'calculators': 'الحاسبات', 'dates': 'التاريخ والوقت', 'text': 'النصوص', 'images': 'الصور', 'documents': 'المستندات'}.get(slug, 'أدوات')


def faq_schema(tool):
    return {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in tool.get('faq', [])]}


def tool_page(tool, tools):
    related = [item for item in tools if item['slug'] != tool['slug'] and item['category'] == tool['category']][:3]
    faqs = ''.join(f'<details><summary>{escape(q)}</summary><p>{escape(a)}</p></details>' for q, a in tool.get('faq', []))
    related_html = ''.join(card(item) for item in related)
    qr_script = '<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js" defer></script>' if tool['slug'] == 'qr-code' else ''
    tool_url = f"{SITE_URL}/tools/{tool['slug']}"
    app_schema = {'@type': 'WebApplication', '@id': f'{tool_url}#app', 'name': tool['name'], 'url': tool_url, 'description': tool['seoDescription'], 'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Any', 'inLanguage': 'ar', 'isAccessibleForFree': True, 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}}
    breadcrumb = {'@type': 'BreadcrumbList', '@id': f'{tool_url}#breadcrumb', 'itemListElement': [{'@type': 'ListItem', 'position': 1, 'name': 'الرئيسية', 'item': f'{SITE_URL}/'}, {'@type': 'ListItem', 'position': 2, 'name': 'الأدوات', 'item': f'{SITE_URL}/tools'}, {'@type': 'ListItem', 'position': 3, 'name': tool['name'], 'item': tool_url}]}
    faq = faq_schema(tool)
    graph = {'@context': 'https://schema.org', '@graph': [app_schema, breadcrumb, {'@type': 'FAQPage', '@id': f'{tool_url}#faq', 'mainEntity': faq['mainEntity']}]}
    extra = f'{jsonld(graph)}{qr_script}'
    return f'''{head(tool['seoTitle'], tool['seoDescription'], '/tools/' + tool['slug'], extra)}
<body>{header('tools')}<main id="main"><section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="/">الرئيسية</a><span>/</span><a href="/tools">الأدوات</a><span>/</span><span>{escape(tool['name'])}</span></div><h1>{escape(tool['name'])}</h1><p>{escape(tool['intro'])}</p></div></section>
<section class="section"><div class="container tool-layout"><div><div class="tool-panel"><h2>استخدم {escape(tool['name'])}</h2><p class="tool-instruction">{escape(tool['intro'])} أدخل البيانات المطلوبة ثم راجع النتيجة قبل استخدامها.</p><div class="tool-app" data-tool="{escape(tool['slug'])}"><noscript>تحتاج هذه الأداة إلى تفعيل JavaScript لعرض الحقول والنتيجة التفاعلية.</noscript></div></div><article class="article-copy"><h2>حول {escape(tool['name'])}</h2><p>{escape(tool['intro'])} صممت هذه الأداة لتكون مباشرة وسهلة الاستخدام من الهاتف والكمبيوتر، ولا تحتاج إلى تسجيل حساب.</p><h2>أسئلة شائعة</h2><div class="faq-list">{faqs}</div></article></div><aside class="info-card"><h2>لماذا تستخدمها؟</h2><ul><li>مجانية وبدون تسجيل.</li><li>واجهة عربية واضحة.</li><li>نتيجة مباشرة من متصفحك.</li><li>تصميم مناسب للجوال.</li></ul></aside></div></section>
<section class="section" style="padding-top:0"><div class="container"><div class="section-head"><div><div class="section-kicker">قد تحتاج أيضًا</div><h2>أدوات مرتبطة</h2></div></div><div class="tool-grid">{related_html}</div></div></section></main>{footer()}<script src="/assets/js/tool-app.js?v={ASSET_VERSION}" defer></script></body></html>'''


def index_page(tools):
    featured = ''.join(card(tool) for tool in tools[:6])
    quick = ''.join(f'<a class="quick-tool" href="/tools/{escape(tool["slug"])}"><span class="tool-icon" aria-hidden="true">{escape(tool["icon"])}</span><span>{escape(tool["name"])}</span></a>' for tool in tools[:4])
    website = {'@context': 'https://schema.org', '@type': 'WebSite', '@id': f'{SITE_URL}/#website', 'name': 'محتوى أدوات', 'url': f'{SITE_URL}/', 'inLanguage': 'ar', 'potentialAction': {'@type': 'SearchAction', 'target': f'{SITE_URL}/tools?q={{search_term_string}}', 'query-input': 'required name=search_term_string'}}
    return f'''{head('محتوى أدوات | أدوات عربية مجانية وسريعة', 'أدوات عربية مجانية للتاريخ والنصوص والصور والمستندات، تعمل مباشرة من المتصفح وبدون تسجيل.', '/', jsonld(website))}
<body>{header('home')}<main id="main"><section class="hero"><div class="container hero-grid"><div><span class="eyebrow">أدوات عملية باللغة العربية</span><h1>أنجز مهمتك، <strong>بدون تعقيد.</strong></h1><p>مجموعة أدوات مجانية وسريعة للتاريخ والنصوص والصور والمستندات. اختر الأداة، استخدمها مباشرة، واحتفظ بنتيجتك.</p><div class="hero-actions"><a class="button-primary" href="/tools">تصفح كل الأدوات</a><a class="button-secondary" href="#how-it-works">كيف تعمل؟</a></div></div><div class="hero-card"><div class="hero-card-label"><span><span class="live-dot"></span>متاح الآن</span><span>مجاني دائمًا</span></div><div class="search-box"><span aria-hidden="true">⌕</span><input id="home-search" type="search" placeholder="ابحث عن أداة..." aria-label="ابحث عن أداة"></div><div class="quick-tools" id="quick-tools">{quick}</div><p class="result-muted">ملفاتك ونصوصك تبقى في جهازك في الأدوات التي تدعم المعالجة المحلية.</p></div></div></section>
<section class="section"><div class="container"><div class="section-head"><div><div class="section-kicker">ابدأ من هنا</div><h2>الأدوات الأكثر استخدامًا</h2></div><a class="button-secondary" href="/tools">عرض الكل ←</a></div><div class="tool-grid">{featured}</div></div></section>
<section class="section" id="how-it-works" style="background:#f1f7f5"><div class="container"><div class="section-head"><div><div class="section-kicker">بسيطة من البداية</div><h2>ثلاث خطوات وتنتهي</h2></div><p class="section-intro">لا حسابات ولا إعدادات طويلة. صممنا الأدوات لتصل إلى النتيجة بأقل عدد من النقرات.</p></div><div class="steps"><div class="step"><div class="step-number">01</div><h3>اختر الأداة</h3><p>ابحث باسم المهمة أو تصفح التصنيفات للوصول إلى الأداة المناسبة.</p></div><div class="step"><div class="step-number">02</div><h3>أدخل بياناتك</h3><p>استخدم نموذجًا واضحًا ومباشرًا مع رسائل عربية عند وجود أي خطأ.</p></div><div class="step"><div class="step-number">03</div><h3>خذ النتيجة</h3><p>انسخ النتيجة أو نزّل الملف أو اطبعه حسب نوع الأداة.</p></div></div></div></section>
<section class="section"><div class="container"><div class="trust-strip"><strong>خصوصيتك أولًا:</strong> أدوات الصور والنصوص مصممة لتعمل داخل المتصفح قدر الإمكان، ولا تحتاج إلى إنشاء حساب.</div></div></section></main>{footer()}<script src="/assets/js/site.js?v={ASSET_VERSION}" defer></script></body></html>'''


def catalog_page(tools, category_data):
    categories = ''.join(f'<button class="filter-button" data-category="{escape(c["slug"])}">{escape(c["name"])}</button>' for c in category_data)
    cards = ''.join(card(tool) for tool in tools)
    return f'''{head('كل الأدوات العربية المجانية | محتوى أدوات', 'تصفح جميع أدوات محتوى المجانية للتاريخ والنصوص والصور والمستندات.', '/tools')}
<body>{header('tools')}<main id="main"><section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="/">الرئيسية</a><span>/</span><span>كل الأدوات</span></div><h1>كل الأدوات</h1><p>اختر ما تحتاجه من أدوات عربية مجانية تعمل بسرعة وبدون تسجيل.</p></div></section><section class="section"><div class="container"><div class="catalog-controls"><div class="catalog-search"><span aria-hidden="true">⌕</span><input id="tools-search" type="search" placeholder="ابحث باسم الأداة أو المهمة..." aria-label="ابحث في الأدوات"></div><div class="filter-list"><button class="filter-button active" data-category="all">الكل</button>{categories}</div></div><h2 class="catalog-heading">الأدوات المتاحة</h2><div class="tool-grid" id="tool-grid">{cards}</div></div></section></main>{footer()}<script src="/assets/js/site.js?v={ASSET_VERSION}" defer></script><script>new URLSearchParams(location.search).get('q') && document.addEventListener('DOMContentLoaded',()=>{{const q=new URLSearchParams(location.search).get('q');const input=document.querySelector('#tools-search');if(input){{input.value=q;input.dispatchEvent(new Event('input'));}}}});</script></body></html>'''


def category_page(category, tools):
    category_tools = [tool for tool in tools if tool['category'] == category['slug']]
    cards = ''.join(card(tool) for tool in category_tools)
    title = f"أدوات {category['name']} المجانية | محتوى أدوات"
    description = f"تصفح أدوات {category['name']} المجانية من محتوى، مع صفحات سريعة وواضحة باللغة العربية."
    category_url = f"{SITE_URL}/categories/{category['slug']}"
    schema = {'@context': 'https://schema.org', '@graph': [{'@type': 'CollectionPage', '@id': f'{category_url}#page', 'name': title, 'url': category_url, 'description': description, 'inLanguage': 'ar'}, {'@type': 'BreadcrumbList', '@id': f'{category_url}#breadcrumb', 'itemListElement': [{'@type': 'ListItem', 'position': 1, 'name': 'الرئيسية', 'item': f'{SITE_URL}/'}, {'@type': 'ListItem', 'position': 2, 'name': 'الأدوات', 'item': f'{SITE_URL}/tools'}, {'@type': 'ListItem', 'position': 3, 'name': category['name'], 'item': category_url}]}]}
    extra = jsonld(schema)
    return f'''{head(title, description, '/categories/' + category['slug'], extra)}
<body>{header('tools')}<main id="main"><section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="/">الرئيسية</a><span>/</span><a href="/tools">الأدوات</a><span>/</span><span>{escape(category['name'])}</span></div><h1>أدوات {escape(category['name'])}</h1><p>مجموعة منتقاة من أدوات {escape(category['name'])} المجانية التي تعمل مباشرة من المتصفح.</p></div></section><section class="section"><div class="container"><h2 class="catalog-heading">الأدوات المتاحة</h2><div class="tool-grid">{cards}</div></div></section></main>{footer()}</body></html>'''


def write_site(data):
    tools = data['tools']
    category_data = data.get('categories', [])
    (ROOT / 'categories').mkdir(exist_ok=True)
    (ROOT / 'index.html').write_text(index_page(tools), encoding='utf-8')
    (ROOT / 'tools.html').write_text(catalog_page(tools, category_data), encoding='utf-8')
    for tool in tools:
        (ROOT / 'tools' / f"{tool['slug']}.html").write_text(tool_page(tool, tools), encoding='utf-8')
    for category in category_data:
        category_tools = [tool for tool in tools if tool['category'] == category['slug']]
        if len(category_tools) >= 2:
            (ROOT / 'categories' / f"{category['slug']}.html").write_text(category_page(category, tools), encoding='utf-8')
    category_urls = [f"/categories/{category['slug']}" for category in category_data if len([tool for tool in tools if tool['category'] == category['slug']]) >= 2]
    urls = ['/', '/tools', '/about', '/privacy', '/contact'] + category_urls + [f"/tools/{tool['slug']}" for tool in tools]
    url_xml = '\n'.join(f'  <url><loc>{SITE_URL}{url}</loc><lastmod>{lastmod_for(url)}</lastmod></url>' for url in urls)
    (ROOT / 'sitemap.xml').write_text(f'''<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{url_xml}\n</urlset>\n''', encoding='utf-8')
    routes = [{'path': url, 'title': 'الرئيسية' if url == '/' else 'كل الأدوات' if url == '/tools' else next((c['name'] for c in category_data if url == f"/categories/{c['slug']}"), next((t['name'] for t in tools if url == f"/tools/{t['slug']}"), url))} for url in urls]
    (ROOT / 'manus-routes.json').write_text(json.dumps({'routes': routes}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    write_site(load_data())
    print(f'Generated {len(load_data()["tools"])} tool pages, sitemap.xml and manus-routes.json')
