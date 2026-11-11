#!/usr/bin/env python3
"""Small dependency-free pre-publish validator for the static tools site."""
from pathlib import Path
from html.parser import HTMLParser
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []


def fail(message):
    errors.append(message)

try:
    data = json.loads((ROOT / 'data/tools.json').read_text(encoding='utf-8'))
except Exception as exc:
    fail(f'data/tools.json is invalid: {exc}')
    data = {'tools': []}

slugs = [tool.get('slug') for tool in data.get('tools', [])]
if len(slugs) != len(set(slugs)): fail('Duplicate tool slugs found')
for tool in data.get('tools', []):
    for key in ('slug', 'name', 'description', 'seoTitle', 'seoDescription', 'category'):
        if not tool.get(key): fail(f'Missing {key} in tool {tool.get("slug")}')
    page = ROOT / 'tools' / f"{tool.get('slug')}.html"
    if not page.exists(): fail(f'Missing generated page: {page.relative_to(ROOT)}')

class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.canonicals = []
        self.titles = []
        self.meta = {}
        self.jsonld = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonicals.append(attrs.get('href', ''))
        if tag == 'meta' and attrs.get('name'):
            self.meta[attrs['name']] = attrs.get('content', '')
        if tag == 'meta' and attrs.get('property'):
            self.meta[attrs['property']] = attrs.get('content', '')
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.jsonld.append('')
    def handle_endtag(self, tag):
        pass
    def handle_data(self, data):
        if data.strip(): self.titles.append(data.strip())

html_files = [ROOT / 'index.html', ROOT / 'tools.html', ROOT / 'about.html', ROOT / 'privacy.html', ROOT / 'contact.html'] + list((ROOT / 'tools').glob('*.html')) + list((ROOT / 'categories').glob('*.html'))
for path in html_files:
    if not path.exists():
        fail(f'Missing page: {path.relative_to(ROOT)}')
        continue
    parser = LinkParser()
    source = path.read_text(encoding='utf-8')
    parser.feed(source)
    if not parser.canonicals: fail(f'No canonical: {path.relative_to(ROOT)}')
    if len(parser.canonicals) != 1: fail(f'Multiple canonicals: {path.relative_to(ROOT)}')
    expected_path = '/' if path.name == 'index.html' else '/' + str(path.relative_to(ROOT)).removesuffix('.html')
    expected_canonical = f'https://muhtawaa.com{expected_path}'
    if parser.canonicals and parser.canonicals[0] != expected_canonical:
        fail(f'Wrong canonical in {path.relative_to(ROOT)}: {parser.canonicals[0]}')
    if not parser.titles: fail(f'Missing title: {path.relative_to(ROOT)}')
    if not parser.meta.get('description'): fail(f'Missing description: {path.relative_to(ROOT)}')
    for key in ('og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'):
        if not parser.meta.get(key): fail(f'Missing {key} in {path.relative_to(ROOT)}')
    if source.count('<h1') != 1: fail(f'Expected one H1: {path.relative_to(ROOT)}')
    for raw in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', source, flags=re.S):
        try:
            payload = json.loads(raw)
            if payload.get('@context') != 'https://schema.org': fail(f'Invalid Schema context: {path.relative_to(ROOT)}')
            types = {item.get('@type') for item in payload.get('@graph', [payload]) if isinstance(item, dict)}
            if not types: fail(f'Empty Schema graph: {path.relative_to(ROOT)}')
        except json.JSONDecodeError as exc:
            fail(f'Invalid JSON-LD in {path.relative_to(ROOT)}: {exc}')
    for link in parser.links:
        if link.startswith('/') and not link.startswith('//') and '#' not in link:
            target = link.split('?', 1)[0].lstrip('/') or 'index.html'
            if target.endswith('.xml') or target.endswith('.txt'): continue
            candidate = ROOT / target
            html_candidate = ROOT / f'{target}.html'
            if not candidate.exists() and not html_candidate.exists() and not (ROOT / target / 'index.html').exists():
                fail(f'Broken internal link in {path.relative_to(ROOT)}: {link}')

try:
    routes = json.loads((ROOT / 'manus-routes.json').read_text(encoding='utf-8'))
    route_paths = {item['path'] for item in routes['routes']}
    category_paths = {f'/categories/{category["slug"]}' for category in data.get('categories', []) if sum(1 for tool in data.get('tools', []) if tool.get('category') == category.get('slug')) >= 2}
    expected = {'/', '/tools', '/about', '/privacy', '/contact'} | category_paths | {f'/tools/{slug}' for slug in slugs}
    if route_paths != expected: fail('manus-routes.json does not match the expected page set')
except Exception as exc:
    fail(f'manus-routes.json is invalid: {exc}')

sitemap = (ROOT / 'sitemap.xml').read_text(encoding='utf-8') if (ROOT / 'sitemap.xml').exists() else ''
if not re.search(r'<lastmod>\d{4}-\d{2}-\d{2}</lastmod>', sitemap):
    fail('sitemap.xml has no valid lastmod dates')
if '<lastmod>None</lastmod>' in sitemap:
    fail('sitemap.xml contains empty lastmod values')
for path in {'https://muhtawaa.com/', 'https://muhtawaa.com/tools'} | {f'https://muhtawaa.com/tools/{slug}' for slug in slugs}:
    if path not in sitemap: fail(f'Missing sitemap URL: {path}')

if errors:
    print('VALIDATION FAILED')
    print('\n'.join(f'- {item}' for item in errors))
    sys.exit(1)
print(f'VALIDATION OK: {len(html_files)} HTML pages, {len(slugs)} tools')
