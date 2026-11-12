#!/usr/bin/env python3
"""Generate the static Arabic tools site and social cards from data/tools.json."""
from html import escape
from pathlib import Path
import json
import subprocess
import sys
import xml.etree.ElementTree as ET

from generate_og_images import generate_og_images

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data' / 'tools.json'
ASSET_VERSION = '20261112-1'
SITE_URL = 'https://muhtawaa.com'


def load_data():
    return json.loads(DATA.read_text(encoding='utf-8'))


def output_path_for(url):
    """Map a clean public route to its generated HTML file."""
    if url == '/':
        return 'index.html'
    return f'{url.lstrip("/")}.html'


def git_commit_date(path):
    """Return the last commit date for one generated file, or None without Git history."""
    try:
        result = subprocess.run(
            ['git', 'log', '-1', '--format=%cs', '--', path],
            cwd=ROOT, capture_output=True, text=True, check=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    return result.stdout.strip() or None


def previous_lastmods():
    """Read existing sitemap dates before the next generated sitemap replaces it."""
    path = ROOT / 'sitemap.xml'
    if not path.exists():
        return {}
    namespace = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        print(f'WARNING: cannot parse existing sitemap.xml: {exc}', file=sys.stderr)
        return {}
    result = {}
    for node in root.findall('s:url', namespace):
        loc = node.find('s:loc', namespace)
        lastmod = node.find('s:lastmod', namespace)
        if loc is not None and lastmod is not None and loc.text and lastmod.text:
            route = loc.text.replace(SITE_URL, '', 1) or '/'
            result[route] = lastmod.text
    return result


def lastmod_for(url, previous):
    """Use today's date for pending content changes and Git dates for unchanged routes."""
    output = output_path_for(url)
    pending = subprocess.run(['git', 'status', '--porcelain', '--', output], capture_output=True, text=True, cwd=ROOT).stdout.strip()
    if pending:
        return subprocess.check_output(['date', '-u', '+%F'], text=True).strip()
    date_value = git_commit_date(output)
    if date_value:
        return date_value
    if url in previous:
        print(f'WARNING: no Git history for {output}; keeping previous lastmod', file=sys.stderr)
        return previous[url]
    source_date = git_commit_date('data/tools.json')
    if source_date:
        return source_date
    raise SystemExit(f'Cannot determine lastmod for {url}: no Git history and no previous sitemap value')


def jsonld(value):
    return f'<script type="application/ld+json">{json.dumps(value, ensure_ascii=False, separators=(",", ":"))}</script>'


def head(title, description, canonical, extra='', og_image='/assets/images/og/site.png', og_alt='محتوى أدوات — أدوات عربية مجانية'):
    url = f'{SITE_URL}{canonical}'
    image_url = og_image if og_image.startswith('https://') else f'{SITE_URL}{og_image}'
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
  <meta property="og:locale" content="ar_SA">
  <meta property="og:site_name" content="محتوى أدوات">
  <meta property="og:title" content="{escape(title)}">
  <meta property="og:description" content="{escape(description)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{escape(image_url, quote=True)}">
  <meta property="og:image:alt" content="{escape(og_alt, quote=True)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{escape(title)}">
  <meta name="twitter:description" content="{escape(description)}">
  <meta name="twitter:image" content="{escape(image_url, quote=True)}">
  <meta name="twitter:image:alt" content="{escape(og_alt, quote=True)}">
  <meta name="theme-color" content="#18a673">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/assets/fonts/Cairo-Arabic.woff2" as="font" type="font/woff2" crossorigin>
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


def paragraph_markup(value):
    paragraphs = [part.strip() for part in str(value or '').split('\n\n') if part.strip()]
    return ''.join(f'<p>{escape(part)}</p>' for part in paragraphs)


def guide_markup(tool):
    steps = ''.join(f'<li>{escape(item)}</li>' for item in tool.get('howTo', []))
    notes = ''.join(f'<li>{escape(item)}</li>' for item in tool.get('notes', []))
    examples = ''.join(f'<div class="example-card"><h3>{escape(item["title"])}</h3><p>{escape(item["text"])}</p></div>' for item in tool.get('examples', []))
    method_title = escape(tool.get('methodTitle', 'كيف تعمل الأداة؟'))
    formula = tool.get('formula', '').strip()
    formula_markup = f'<div class="formula-card"><strong>المعادلة أو طريقة المعالجة:</strong><p>{escape(formula)}</p></div>' if formula else ''
    return f'''<h2>{method_title}</h2><p>{escape(tool.get('howWeCalculate', ''))}</p>{formula_markup}<h2>طريقة الاستخدام</h2><ol class="guide-list">{steps}</ol><h2>أمثلة عملية</h2><div class="example-grid">{examples}</div><h2>ملاحظات مهمة</h2><ul class="guide-list">{notes}</ul>'''


def tool_page(tool, tools):
    by_slug = {item['slug']: item for item in tools}
    related = [by_slug[slug] for slug in tool.get('relatedTools', []) if slug in by_slug and slug != tool['slug']]
    if not related:
        related = [item for item in tools if item['slug'] != tool['slug'] and item['category'] == tool['category']][:3]
    faqs = ''.join(f'<details><summary>{escape(q)}</summary><p>{escape(a)}</p></details>' for q, a in tool.get('faq', []))
    related_html = ''.join(card(item) for item in related)
    tool_url = f"{SITE_URL}/tools/{tool['slug']}"
    app_schema = {'@type': 'WebApplication', '@id': f'{tool_url}#app', 'name': tool['name'], 'url': tool_url, 'description': tool['seoDescription'], 'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Any', 'inLanguage': 'ar', 'isAccessibleForFree': True, 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}}
    breadcrumb = {'@type': 'BreadcrumbList', '@id': f'{tool_url}#breadcrumb', 'itemListElement': [{'@type': 'ListItem', 'position': 1, 'name': 'الرئيسية', 'item': f'{SITE_URL}/'}, {'@type': 'ListItem', 'position': 2, 'name': 'الأدوات', 'item': f'{SITE_URL}/tools'}, {'@type': 'ListItem', 'position': 3, 'name': tool['name'], 'item': tool_url}]}
    graph = {'@context': 'https://schema.org', '@graph': [app_schema, breadcrumb, {'@type': 'FAQPage', '@id': f'{tool_url}#faq', 'mainEntity': faq_schema(tool)['mainEntity']}]}
    extra = jsonld(graph)
    sources = tool.get('sources', [])
    source_markup = ''
    if sources:
        source_rows = ''.join(f'<li><a href="{escape(item["url"], quote=True)}" target="_blank" rel="noopener noreferrer">{escape(item["title"])}</a><span> — {escape(item.get("claim", ""))} ({escape(item.get("checkedAt", ""))})</span></li>' for item in sources)
        source_markup = f'<h2>مصادر موثوقة</h2><ul class="guide-list source-list">{source_rows}</ul>'
    image_path = f'/assets/images/og/tools/{tool["slug"]}.png'
    search_question = tool.get('searchQuestion', tool['name'])
    return f'''{head(tool['seoTitle'], tool['seoDescription'], '/tools/' + tool['slug'], extra, image_path, search_question)}
<body>{header('tools')}<main id="main"><section class="page-hero tool-page-hero"><div class="container"><div class="breadcrumbs"><a href="/">الرئيسية</a><span>/</span><a href="/tools">الأدوات</a><span>/</span><span>{escape(tool['name'])}</span></div><div class="tool-hero-grid"><div class="tool-hero-copy"><h1>{escape(search_question)}</h1><p class="tool-answer">{escape(tool.get('summary', tool['description']))}</p></div><div class="tool-panel"><h2>{escape(tool['name'])}</h2><p class="tool-instruction">{escape(tool.get('usageHint', 'أدخل البيانات المطلوبة ثم راجع النتيجة.'))}</p><div class="tool-app" data-tool="{escape(tool['slug'])}"><noscript>تحتاج هذه الأداة إلى تفعيل JavaScript لعرض الحقول والنتيجة التفاعلية.</noscript></div></div></div></div></section>
<section class="section"><article class="container article-copy"><h2>حول {escape(tool['name'])}</h2>{paragraph_markup(tool.get('intro', ''))}{guide_markup(tool)}{source_markup}<h2>أسئلة شائعة</h2><div class="faq-list">{faqs}</div></article></section>
<section class="section related-section"><div class="container"><div class="section-head"><div><div class="section-kicker">قد تحتاج أيضًا</div><h2>أدوات مرتبطة</h2></div></div><div class="tool-grid">{related_html}</div></div></section></main>{footer()}<script src="/assets/js/tool-app.js?v={ASSET_VERSION}" defer></script></body></html>'''


def index_page(tools):
    featured = ''.join(card(tool) for tool in tools[:6])
    quick = ''.join(f'<a class="quick-tool" href="/tools/{escape(tool["slug"])}"><span class="tool-icon" aria-hidden="true">{escape(tool["icon"])}</span><span>{escape(tool["name"])}</span></a>' for tool in tools[:4])
    website = {'@context': 'https://schema.org', '@type': 'WebSite', '@id': f'{SITE_URL}/#website', 'name': 'محتوى أدوات', 'url': f'{SITE_URL}/', 'inLanguage': 'ar', 'potentialAction': {'@type': 'SearchAction', 'target': f'{SITE_URL}/tools?q={{search_term_string}}', 'query-input': 'required name=search_term_string'}}
    return f'''{head('أدوات وحاسبات عربية مجانية: عمر، تاريخ هجري، ضريبة، صور', 'استخدم أدوات عربية مجانية لحساب العمر والتاريخ الهجري والضريبة والنسب، مع أدوات عملية للنصوص والصور والمستندات.', '/', jsonld(website), '/assets/images/og/site.png', 'أدوات وحاسبات عربية مجانية من محتوى أدوات')}
<body>{header('home')}<main id="main"><section class="hero"><div class="container hero-grid"><div><span class="eyebrow">أدوات عملية باللغة العربية</span><h1>أنجز مهمتك، <strong>بدون تعقيد.</strong></h1><p>مجموعة أدوات مجانية وسريعة للتاريخ والنصوص والصور والمستندات. اختر الأداة، استخدمها مباشرة، واحتفظ بنتيجتك.</p><div class="hero-actions"><a class="button-primary" href="/tools">تصفح كل الأدوات</a><a class="button-secondary" href="#how-it-works">كيف تعمل؟</a></div></div><div class="hero-card"><div class="hero-card-label"><span><span class="live-dot"></span>متاح الآن</span><span>مجاني دائمًا</span></div><div class="search-box"><span aria-hidden="true">⌕</span><input id="home-search" type="search" placeholder="ابحث عن أداة..." aria-label="ابحث عن أداة"></div><div class="quick-tools" id="quick-tools">{quick}</div><p class="result-muted">ملفاتك ونصوصك تبقى في جهازك في الأدوات التي تدعم المعالجة المحلية.</p></div></div></section>
<section class="section"><div class="container"><div class="section-head"><div><div class="section-kicker">ابدأ من هنا</div><h2>الأدوات الأكثر استخدامًا</h2></div><a class="button-secondary" href="/tools">عرض الكل ←</a></div><div class="tool-grid">{featured}</div></div></section>
<section class="section"><div class="container"><div class="section-head"><div><div class="section-kicker">لماذا محتوى أدوات؟</div><h2>أدوات عربية تفهم سياقك</h2></div><p class="section-intro">لسنا مجرد حاسبات عامة؛ نكتب الشرح والأمثلة بما يناسب المستخدم العربي، ونوضح أين تبقى بياناتك داخل جهازك.</p></div><div class="value-grid"><div class="value-card"><div class="value-icon" aria-hidden="true">ع</div><h3>العربية أولًا</h3><p>واجهات ورسائل وأمثلة عربية واضحة، مع اهتمام باتجاه النص والأرقام وسهولة القراءة من اليمين إلى اليسار.</p></div><div class="value-card"><div class="value-icon" aria-hidden="true">﷼</div><h3>أمثلة من واقعنا</h3><p>في الأدوات المالية نستخدم أمثلة بالريال السعودي ونشرح الفرق بين السعر قبل الضريبة وبعدها بدل الاكتفاء بالنتيجة.</p></div><div class="value-card"><div class="value-icon" aria-hidden="true">⌁</div><h3>خصوصية مفهومة</h3><p>نعرض بوضوح ما تتم معالجته محليًا داخل المتصفح، وما يحتاج مكتبة خارجية، بدل وعود عامة غير قابلة للتحقق.</p></div><div class="value-card"><div class="value-icon" aria-hidden="true">▣</div><h3>مصمم للهاتف</h3><p>حقول كبيرة، خطوات قليلة، ونتائج قابلة للنسخ أو التنزيل من شاشة الجوال دون تعقيد.</p></div></div></div></section>
<section class="section" id="how-it-works" style="background:#f1f7f5"><div class="container"><div class="section-head"><div><div class="section-kicker">بسيطة من البداية</div><h2>ثلاث خطوات وتنتهي</h2></div><p class="section-intro">لا حسابات ولا إعدادات طويلة. صممنا الأدوات لتصل إلى النتيجة بأقل عدد من النقرات.</p></div><div class="steps"><div class="step"><div class="step-number">01</div><h3>اختر الأداة</h3><p>ابحث باسم المهمة أو تصفح التصنيفات للوصول إلى الأداة المناسبة.</p></div><div class="step"><div class="step-number">02</div><h3>أدخل بياناتك</h3><p>استخدم نموذجًا واضحًا ومباشرًا مع رسائل عربية عند وجود أي خطأ.</p></div><div class="step"><div class="step-number">03</div><h3>خذ النتيجة</h3><p>انسخ النتيجة أو نزّل الملف أو اطبعه حسب نوع الأداة.</p></div></div></div></section>
<section class="section"><div class="container"><div class="trust-strip"><strong>خصوصيتك أولًا:</strong> أدوات الصور والنصوص مصممة لتعمل داخل المتصفح قدر الإمكان، ولا تحتاج إلى إنشاء حساب.</div></div></section></main>{footer()}<script src="/assets/js/site.js?v={ASSET_VERSION}" defer></script></body></html>'''


def catalog_page(tools, category_data):
    categories = ''.join(f'<button class="filter-button" data-category="{escape(c["slug"])}">{escape(c["name"])}</button>' for c in category_data)
    cards = ''.join(card(tool) for tool in tools)
    category_links = ''.join(f'<a href="/categories/{escape(c["slug"])}">{escape(c["name"])}</a>' for c in category_data if any(tool['category'] == c['slug'] for tool in tools))
    return f'''{head('كل الأدوات العربية المجانية | محتوى أدوات', 'تصفح جميع أدوات محتوى المجانية للتاريخ والنصوص والصور والمستندات.', '/tools')}
<body>{header('tools')}<main id="main"><section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="/">الرئيسية</a><span>/</span><span>كل الأدوات</span></div><h1>كل الأدوات</h1><p>اختر ما تحتاجه من أدوات عربية مجانية تعمل بسرعة وبدون تسجيل.</p></div></section><section class="section"><div class="container"><div class="catalog-controls"><div class="catalog-search"><span aria-hidden="true">⌕</span><input id="tools-search" type="search" placeholder="ابحث باسم الأداة أو المهمة..." aria-label="ابحث في الأدوات"></div><div class="filter-list"><button class="filter-button active" data-category="all">الكل</button>{categories}</div></div><nav class="category-shortcuts" aria-label="صفحات التصنيفات">{category_links}</nav><h2 class="catalog-heading">الأدوات المتاحة</h2><div class="tool-grid" id="tool-grid">{cards}</div></div></section></main>{footer()}<script src="/assets/js/site.js?v={ASSET_VERSION}" defer></script><script>new URLSearchParams(location.search).get('q') && document.addEventListener('DOMContentLoaded',()=>{{const q=new URLSearchParams(location.search).get('q');const input=document.querySelector('#tools-search');if(input){{input.value=q;input.dispatchEvent(new Event('input'));}}}});</script></body></html>'''


def category_page(category, tools):
    category_tools = [tool for tool in tools if tool['category'] == category['slug']]
    cards = ''.join(card(tool) for tool in category_tools)
    title = f"أدوات {category['name']} المجانية | محتوى أدوات"
    description = f"تصفح أدوات {category['name']} المجانية من محتوى، مع صفحات سريعة وواضحة باللغة العربية."
    category_url = f"{SITE_URL}/categories/{category['slug']}"
    schema = {'@context': 'https://schema.org', '@graph': [{'@type': 'CollectionPage', '@id': f'{category_url}#page', 'name': title, 'url': category_url, 'description': description, 'inLanguage': 'ar'}, {'@type': 'BreadcrumbList', '@id': f'{category_url}#breadcrumb', 'itemListElement': [{'@type': 'ListItem', 'position': 1, 'name': 'الرئيسية', 'item': f'{SITE_URL}/'}, {'@type': 'ListItem', 'position': 2, 'name': 'الأدوات', 'item': f'{SITE_URL}/tools'}, {'@type': 'ListItem', 'position': 3, 'name': category['name'], 'item': category_url}]}]}
    extra = jsonld(schema)
    image_path = f'/assets/images/og/categories/{category["slug"]}.png'
    return f'''{head(title, description, '/categories/' + category['slug'], extra, image_path, title)}
<body>{header('tools')}<main id="main"><section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="/">الرئيسية</a><span>/</span><a href="/tools">الأدوات</a><span>/</span><span>{escape(category['name'])}</span></div><h1>أدوات {escape(category['name'])}</h1><p>مجموعة منتقاة من أدوات {escape(category['name'])} المجانية التي تعمل مباشرة من المتصفح.</p></div></section><section class="section"><div class="container"><h2 class="catalog-heading">الأدوات المتاحة</h2><div class="tool-grid">{cards}</div></div></section></main>{footer()}</body></html>'''


def write_site(data):
    tools = data['tools']
    category_data = data.get('categories', [])
    generated_images = generate_og_images(data, ROOT)
    previous = previous_lastmods()
    (ROOT / 'categories').mkdir(exist_ok=True)
    (ROOT / 'index.html').write_text(index_page(tools), encoding='utf-8')
    (ROOT / 'tools.html').write_text(catalog_page(tools, category_data), encoding='utf-8')
    for tool in tools:
        (ROOT / 'tools' / f"{tool['slug']}.html").write_text(tool_page(tool, tools), encoding='utf-8')
    for category in category_data:
        category_tools = [tool for tool in tools if tool['category'] == category['slug']]
        if category_tools:
            (ROOT / 'categories' / f"{category['slug']}.html").write_text(category_page(category, tools), encoding='utf-8')
    category_urls = [f"/categories/{category['slug']}" for category in category_data if any(tool['category'] == category['slug'] for tool in tools)]
    urls = ['/', '/tools', '/about', '/privacy', '/contact'] + category_urls + [f"/tools/{tool['slug']}" for tool in tools]
    sitemap_urls = [url for url in urls if url != '/categories/documents']
    url_xml = '\n'.join(f'  <url><loc>{SITE_URL}{url}</loc><lastmod>{lastmod_for(url, previous)}</lastmod></url>' for url in sitemap_urls)
    (ROOT / 'sitemap.xml').write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{url_xml}
</urlset>
''', encoding='utf-8')
    routes = [{'path': url, 'title': 'الرئيسية' if url == '/' else 'كل الأدوات' if url == '/tools' else next((c['name'] for c in category_data if url == f"/categories/{c['slug']}"), next((t['name'] for t in tools if url == f"/tools/{t['slug']}"), url))} for url in urls]
    (ROOT / 'manus-routes.json').write_text(json.dumps({'routes': routes}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return generated_images


if __name__ == '__main__':
    image_count = write_site(load_data())
    print(f'Generated {len(load_data()["tools"])} tool pages, category pages, sitemap.xml, routes and {image_count} Open Graph PNGs')
