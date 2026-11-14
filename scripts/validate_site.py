#!/usr/bin/env python3
"""Validate generated pages, route consistency, metadata, and OG PNGs without extra dependencies."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import json
import re
import struct
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
errors = []


def fail(message):
    errors.append(message)


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.canonicals = []
        self.meta = {}
        self.h1 = []
        self._in_h1 = False
        self._current_h1 = ''

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonicals.append(attrs.get('href', ''))
        if tag == 'meta':
            key = attrs.get('name') or attrs.get('property')
            if key:
                self.meta[key] = attrs.get('content', '')
        if tag == 'h1':
            self._in_h1 = True
            self._current_h1 = ''

    def handle_endtag(self, tag):
        if tag == 'h1' and self._in_h1:
            self.h1.append(self._current_h1.strip())
            self._in_h1 = False

    def handle_data(self, data):
        if self._in_h1:
            self._current_h1 += data


try:
    data = json.loads((ROOT / 'data/tools.json').read_text(encoding='utf-8'))
except Exception as exc:
    fail(f'data/tools.json is invalid: {exc}')
    data = {'site': {}, 'categories': [], 'tools': []}

tools = data.get('tools', [])
categories = data.get('categories', [])
slugs = [tool.get('slug') for tool in tools]
category_slugs = [category.get('slug') for category in categories]
if len(slugs) != len(set(slugs)):
    fail('Duplicate tool slugs found')
if len(category_slugs) != len(set(category_slugs)):
    fail('Duplicate category slugs found')
if len(tools) != 55:
    fail(f'Expected 55 tools, found {len(tools)}')

required = ('slug', 'name', 'description', 'seoTitle', 'seoDescription', 'category', 'intro', 'summary', 'searchQuestion', 'usageHint', 'methodTitle', 'howWeCalculate', 'howTo', 'examples', 'notes', 'faq', 'relatedTools')
priority_slugs = {'age-calculator', 'date-difference', 'hijri-converter', 'hijri-calendar', 'zakat-calculator', 'word-counter', 'percentage-calculator', 'vat-calculator', 'end-of-service-calculator', 'pdf-merge', 'pdf-split', 'images-to-pdf', 'pdf-organizer'}
for tool in tools:
    slug = tool.get('slug', '(unknown)')
    for key in required:
        if not tool.get(key):
            fail(f'Missing {key} in tool {slug}')
    if tool.get('category') not in category_slugs:
        fail(f'Unknown category {tool.get("category")} in {slug}')
    if len(tool.get('howTo', [])) != 3:
        fail(f'Expected 3 howTo steps in {slug}')
    if len(tool.get('examples', [])) != 3:
        fail(f'Expected 3 examples in {slug}')
    if len(tool.get('notes', [])) != 3:
        fail(f'Expected 3 notes in {slug}')
    if len(tool.get('faq', [])) != 6:
        fail(f'Expected 6 FAQs in {slug}')
    if slug in {s for s in slugs if s not in {'age-calculator', 'date-difference', 'hijri-converter', 'word-counter', 'qr-code', 'image-compressor', 'image-resizer', 'image-converter', 'text-cleaner', 'invoice-generator', 'percentage-calculator', 'discount-calculator', 'vat-calculator', 'unit-converter', 'number-to-words', 'bmi-calculator', 'password-generator', 'json-formatter', 'end-of-service-calculator', 'hijri-calendar', 'zakat-calculator', 'pdf-merge', 'pdf-split', 'images-to-pdf', 'pdf-organizer'}}:
        content = ' '.join([tool.get('intro', ''), tool.get('howWeCalculate', ''), tool.get('formula', ''), *tool.get('howTo', []), *[x.get('title', '') + ' ' + x.get('text', '') for x in tool.get('examples', [])], *tool.get('notes', []), *[x[0] + ' ' + x[1] for x in tool.get('faq', [])]])
        words = len(content.split())
        if words < 250:
            fail(f'New tool content is only {words} words in {slug}; minimum is 250')
    related = tool.get('relatedTools', [])
    if not 3 <= len(related) <= 5:
        fail(f'Expected 3–5 related tools in {slug}')
    if len(related) != len(set(related)) or slug in related or any(item not in slugs for item in related):
        fail(f'Invalid relatedTools list in {slug}')
    if slug in priority_slugs:
        text = ' '.join([
            tool.get('intro', ''), tool.get('howWeCalculate', ''), tool.get('formula', ''),
            *tool.get('howTo', []), *[x.get('title', '') + ' ' + x.get('text', '') for x in tool.get('examples', [])],
            *tool.get('notes', []), *[x[0] + ' ' + x[1] for x in tool.get('faq', [])],
        ])
        words = len(text.split())
        if not 320 <= words <= 520:
            fail(f'Priority content length is {words} words in {slug}; target is about 400')
    for source in tool.get('sources', []):
        if not source.get('url', '').startswith('https://') or not source.get('title') or not source.get('checkedAt'):
            fail(f'Invalid source entry in {slug}')
    page = ROOT / 'tools' / f'{slug}.html'
    if not page.exists():
        fail(f'Missing generated page: tools/{slug}.html')

try:
    table = json.loads((ROOT / 'data/ummalqura-1356-1500.json').read_text(encoding='utf-8'))
    if (table.get('gregorianStart'), table.get('gregorianEnd'), table.get('hijriStart'), table.get('hijriEnd')) != ('1937-03-14', '2077-11-16', '1356-01-01', '1500-12-30'):
        fail('Umm al-Qura table boundaries do not match the approved range')
    if len(table.get('hijriDateByGregorianDay', [])) != table.get('dayCount'):
        fail('Umm al-Qura table dayCount does not match its data')
    samples = json.loads((ROOT / 'data/ummalqura-official-samples.json').read_text(encoding='utf-8'))
    if len(samples.get('samples', [])) != 30 or not all(item.get('match') for item in samples.get('samples', [])):
        fail('Umm al-Qura official sample verification is incomplete')
except Exception as exc:
    fail(f'Umm al-Qura table or verification samples are invalid: {exc}')

pdf_worker = ROOT / 'assets/js/tools/pdf-tools-worker.js'
pdf_module = ROOT / 'assets/js/tools/pdf-tools.js'
pdf_library = ROOT / 'assets/vendor/pdf-lib.min.js'
pdf_license = ROOT / 'assets/vendor/pdf-lib-LICENSE.md'
for path in (pdf_worker, pdf_module, pdf_library, pdf_license):
    if not path.exists() or path.stat().st_size == 0:
        fail(f'Missing local PDF tool asset: {path.relative_to(ROOT)}')
if pdf_worker.exists():
    worker_source = pdf_worker.read_text(encoding='utf-8')
    if "importScripts('/assets/vendor/pdf-lib.min.js')" not in worker_source:
        fail('PDF worker must import the local pdf-lib bundle, not a CDN')
    if re.search(r'\bfetch\s*\(|XMLHttpRequest|sendBeacon|https?://', worker_source):
        fail('PDF worker contains a network request path')
if pdf_license.exists() and 'MIT License' not in pdf_license.read_text(encoding='utf-8'):
    fail('Bundled pdf-lib license file must include the MIT License text')


def png_dimensions(path):
    try:
        with path.open('rb') as stream:
            header = stream.read(24)
        if len(header) < 24 or header[:8] != b'\x89PNG\r\n\x1a\n' or header[12:16] != b'IHDR':
            return None
        return struct.unpack('>II', header[16:24])
    except OSError:
        return None


expected_categories = {category['slug'] for category in categories if any(tool.get('category') == category['slug'] for tool in tools)}
html_files = [ROOT / name for name in ('index.html', 'tools.html', 'about.html', 'privacy.html', 'contact.html', '404.html')]
html_files += sorted((ROOT / 'tools').glob('*.html'))
html_files += sorted((ROOT / 'categories').glob('*.html'))
for path in html_files:
    if not path.exists():
        fail(f'Missing page: {path.relative_to(ROOT)}')
        continue
    source = path.read_text(encoding='utf-8')
    parser = PageParser()
    parser.feed(source)
    if path.name != '404.html' and not parser.canonicals:
        fail(f'No canonical: {path.relative_to(ROOT)}')
    if path.name != '404.html' and len(parser.canonicals) != 1:
        fail(f'Multiple canonicals: {path.relative_to(ROOT)}')
    expected_path = '/' if path.name == 'index.html' else '/' + str(path.relative_to(ROOT)).removesuffix('.html')
    expected_canonical = f'https://muhtawaa.com{expected_path}'
    if path.name != '404.html' and parser.canonicals and parser.canonicals[0] != expected_canonical:
        fail(f'Wrong canonical in {path.relative_to(ROOT)}: {parser.canonicals[0]}')
    if len(parser.h1) != 1:
        fail(f'Expected one H1: {path.relative_to(ROOT)}')
    if not parser.meta.get('description'):
        fail(f'Missing description: {path.relative_to(ROOT)}')
    for key in ('og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'):
        if not parser.meta.get(key):
            fail(f'Missing {key} in {path.relative_to(ROOT)}')
    if parser.meta.get('og:locale') != 'ar_SA':
        fail(f'og:locale must be ar_SA in {path.relative_to(ROOT)}')
    if parser.meta.get('og:image:type') != 'image/png':
        fail(f'og:image:type must be image/png in {path.relative_to(ROOT)}')
    image_path = ROOT / urlparse(parser.meta.get('og:image', '')).path.lstrip('/')
    if png_dimensions(image_path) != (1200, 630):
        fail(f'OG image missing or not 1200x630: {path.relative_to(ROOT)} -> {image_path}')
    for key in ('og:image:width', 'og:image:height'):
        if not parser.meta.get(key):
            fail(f'Missing {key} in {path.relative_to(ROOT)}')
    expected_asset_version = '20261114-5'
    if f'site.css?v={expected_asset_version}' not in source:
        fail(f'Wrong or missing CSS asset version in {path.relative_to(ROOT)}')
    for link in parser.links:
        if link.startswith('/') and not link.startswith('//') and '#' not in link:
            target = link.split('?', 1)[0].lstrip('/') or 'index.html'
            if target.endswith('.xml') or target.endswith('.txt'):
                continue
            candidate = ROOT / target
            html_candidate = ROOT / f'{target}.html'
            if not candidate.exists() and not html_candidate.exists() and not (ROOT / target / 'index.html').exists():
                fail(f'Broken internal link in {path.relative_to(ROOT)}: {link}')
    for raw in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', source, flags=re.S):
        try:
            payload = json.loads(raw)
            if payload.get('@context') != 'https://schema.org':
                fail(f'Invalid Schema context: {path.relative_to(ROOT)}')
            types = {item.get('@type') for item in payload.get('@graph', [payload]) if isinstance(item, dict)}
            if not types:
                fail(f'Empty Schema graph: {path.relative_to(ROOT)}')
        except json.JSONDecodeError as exc:
            fail(f'Invalid JSON-LD in {path.relative_to(ROOT)}: {exc}')

for tool in tools:
    path = ROOT / 'tools' / f"{tool['slug']}.html"
    if not path.exists():
        continue
    source = path.read_text(encoding='utf-8')
    parser = PageParser()
    parser.feed(source)
    if parser.h1 and parser.h1[0] != tool.get('searchQuestion'):
        fail(f'H1 does not match searchQuestion in {tool["slug"]}')
    if source.find('class="tool-app"') < 0 or source.find('class="tool-app"') > source.find('<article'):
        fail(f'Tool interface is not before the article in {tool["slug"]}')
    if source.count('class="example-card"') != 3:
        fail(f'Generated page does not show exactly 3 examples in {tool["slug"]}')
    if source.count('<details><summary>') != 6:
        fail(f'Generated page does not show exactly 6 FAQs in {tool["slug"]}')
    if 'لماذا محتوى أدوات؟' in source:
        fail(f'Redundant platform pitch remains in {tool["slug"]}')
    if tool['slug'] == 'qr-code' and 'qrcode.min.js' in source:
        fail('QRCode.js must not be included in initial HTML')
    if 'WebApplication' not in source or 'FAQPage' not in source or 'BreadcrumbList' not in source:
        fail(f'Missing expected tool structured data in {tool["slug"]}')
    related_html = source.split('class="related-section"', 1)[-1]
    if related_html.count('class="tool-card"') != len(tool.get('relatedTools', [])):
        fail(f'Related tool cards do not match registry in {tool["slug"]}')

batch4_modules = {
    **{slug: 'converter-family.js' for slug in ('length-converter', 'weight-converter', 'temperature-converter', 'area-converter', 'volume-converter', 'speed-converter', 'pressure-converter', 'energy-converter', 'data-size-converter', 'time-unit-converter')},
    **{slug: 'math-family.js' for slug in ('percentage-adjustment', 'percent-of-number', 'percentage-difference', 'average-calculator', 'ratio-proportion-calculator', 'gcd-lcm-calculator', 'simple-interest-calculator', 'compound-interest-calculator')},
    **{slug: 'text-family.js' for slug in ('character-counter', 'case-converter', 'arabic-diacritics-remover', 'duplicate-spaces-remover', 'reverse-text', 'alphabetize-list', 'text-compare')},
    **{slug: 'date-family.js' for slug in ('date-offset-calculator', 'business-days-calculator', 'iso-week-calculator', 'date-countdown', 'hijri-days-difference')},
}
for slug, module in batch4_modules.items():
    module_path = ROOT / 'assets/js/tools' / module
    if not module_path.exists() or not module_path.stat().st_size:
        fail(f'Missing batch-4 module {module}')
        continue
    page_path = ROOT / 'tools' / f'{slug}.html'
    if page_path.exists() and f'/assets/js/tools/{module}?v=20261114-5' not in page_path.read_text(encoding='utf-8'):
        fail(f'Batch-4 module is not linked by {slug}')
    module_source = module_path.read_text(encoding='utf-8')
    if re.search(r'https?://|\bsendBeacon\s*\(|\bXMLHttpRequest\b|\bWebSocket\b', module_source):
        fail(f'Batch-4 module {module} contains an external/network API path')

og_files = sorted((ROOT / 'assets/images/og').rglob('*.png'))
expected_og_count = 1 + len(tools) + len(expected_categories)
if len(og_files) != expected_og_count:
    fail(f'Expected {expected_og_count} OG PNG files, found {len(og_files)}')
for path in og_files:
    if png_dimensions(path) != (1200, 630):
        fail(f'OG image has invalid dimensions: {path.relative_to(ROOT)}')
for tool in tools:
    if not (ROOT / 'assets/images/og/tools' / f"{tool['slug']}.png").exists():
        fail(f'Missing tool OG image for {tool["slug"]}')
for category in expected_categories:
    if not (ROOT / 'assets/images/og/categories' / f'{category}.png').exists():
        fail(f'Missing category OG image for {category}')

expected_routes = {'/', '/tools', '/about', '/privacy', '/contact'} | {f'/categories/{slug}' for slug in expected_categories} | {f'/tools/{slug}' for slug in slugs}
try:
    routes = json.loads((ROOT / 'manus-routes.json').read_text(encoding='utf-8'))
    route_paths = [item['path'] for item in routes['routes']]
    if len(route_paths) != len(set(route_paths)) or set(route_paths) != expected_routes:
        fail('manus-routes.json does not match the expected page set')
except Exception as exc:
    fail(f'manus-routes.json is invalid: {exc}')

try:
    sitemap_root = ET.parse(ROOT / 'sitemap.xml').getroot()
    ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    sitemap_entries = sitemap_root.findall('s:url', ns)
    sitemap_urls = [entry.findtext('s:loc', namespaces=ns) for entry in sitemap_entries]
    if len(sitemap_urls) != len(set(sitemap_urls)):
        fail('sitemap.xml contains duplicate URLs')
    expected_sitemap_routes = expected_routes - {'/categories/documents'}
    expected_urls = {f'https://muhtawaa.com{route}' for route in expected_sitemap_routes}
    if len(sitemap_urls) != len(expected_sitemap_routes):
        fail(f'Expected {len(expected_sitemap_routes)} sitemap URLs, found {len(sitemap_urls)}')
    if set(sitemap_urls) != expected_urls:
        fail('sitemap.xml does not exactly match generated routes')
    for entry in sitemap_entries:
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', entry.findtext('s:lastmod', namespaces=ns) or ''):
            fail(f'Invalid lastmod for {entry.findtext("s:loc", namespaces=ns)}')
except Exception as exc:
    fail(f'sitemap.xml is invalid: {exc}')

catalog = (ROOT / 'tools.html').read_text(encoding='utf-8') if (ROOT / 'tools.html').exists() else ''
if '/categories/documents' not in catalog:
    fail('Documents category is not linked from the tools catalog')
if '/categories/converters' not in catalog:
    fail('Converters category is not linked from the tools catalog')
if 'og:locale content="ar_AR"' in ''.join(path.read_text(encoding='utf-8') for path in html_files if path.exists()):
    fail('An outdated ar_AR Open Graph locale remains')

if errors:
    print('VALIDATION FAILED')
    print('\n'.join(f'- {item}' for item in errors))
    sys.exit(1)
print(f'VALIDATION OK: {len(html_files)} HTML pages, {len(tools)} tools, {len(expected_categories)} categories, {len(og_files)} OG PNGs')
