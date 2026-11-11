#!/usr/bin/env python3
"""Live technical SEO audit for muhtawaa.com."""
from collections import Counter, defaultdict
from hashlib import sha256
from pathlib import Path
from urllib.parse import urljoin, urlparse
import json
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

BASE = 'https://muhtawaa.com'
ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'data/tools.json').read_text(encoding='utf-8'))
TOOLS = DATA['tools']
TIMEOUT = 25
SESSION = requests.Session()
SESSION.headers.update({'User-Agent': 'MuhtawaaSEOAudit/1.0 (+https://muhtawaa.com)'})


def get(path):
    url = path if path.startswith('http') else urljoin(BASE, path)
    started = time.perf_counter()
    response = SESSION.get(url, timeout=TIMEOUT, allow_redirects=True)
    elapsed = (time.perf_counter() - started) * 1000
    return response, elapsed


def text_hash(soup):
    for element in soup(['script', 'style', 'noscript']):
        element.decompose()
    text = re.sub(r'\s+', ' ', soup.get_text(' ', strip=True))
    return sha256(text.encode('utf-8')).hexdigest(), len(text)


def audit_tool(tool):
    path = f"/tools/{tool['slug']}"
    response, elapsed = get(path)
    soup = BeautifulSoup(response.text, 'html.parser')
    title = soup.title.get_text(' ', strip=True) if soup.title else ''
    description = soup.find('meta', attrs={'name': 'description'})
    canonical = soup.find('link', attrs={'rel': lambda value: value and 'canonical' in value})
    h1s = [h.get_text(' ', strip=True) for h in soup.find_all('h1')]
    body_hash, body_len = text_hash(BeautifulSoup(response.text, 'html.parser'))
    data_tool = soup.select_one('[data-tool]')
    app_text = data_tool.get_text(' ', strip=True) if data_tool else ''
    noscript = soup.find('noscript')
    article = soup.select_one('article')
    return {
        'slug': tool['slug'], 'path': path, 'status': response.status_code,
        'final_url': response.url, 'redirects': len(response.history),
        'elapsed_ms': round(elapsed, 1), 'bytes': len(response.content),
        'title': title, 'title_len': len(title),
        'description': description.get('content', '').strip() if description else '',
        'description_len': len(description.get('content', '').strip()) if description else 0,
        'canonical': canonical.get('href', '') if canonical else '',
        'h1s': h1s, 'h1_count': len(h1s),
        'data_tool': data_tool.get('data-tool') if data_tool else None,
        'pre_js_text_len': len(article.get_text(' ', strip=True)) if article else 0,
        'noscript_present': bool(noscript), 'js_app_empty_before_js': not bool(app_text),
        'body_hash': body_hash, 'body_text_len': body_len,
        'script_tool_app': any('tool-app.js' in (script.get('src') or '') for script in soup.find_all('script')),
    }


def audit_links(paths):
    seen = {}
    sources = defaultdict(list)
    for path in paths:
        response, _ = get(path)
        soup = BeautifulSoup(response.text, 'html.parser')
        for anchor in soup.find_all('a', href=True):
            href = anchor['href'].strip()
            if not href or href.startswith(('#', 'mailto:', 'tel:', 'javascript:')):
                continue
            target = urljoin(response.url, href)
            parsed = urlparse(target)
            if parsed.netloc != urlparse(BASE).netloc:
                continue
            if parsed.path.startswith('/cdn-cgi/'):
                # Cloudflare email obfuscation endpoint, not an authored site route.
                continue
            normalized = parsed._replace(query='', fragment='').geturl()
            sources[normalized].append(path)
    for url in sorted(sources):
        try:
            response, elapsed = get(url)
            seen[url] = {'status': response.status_code, 'final_url': response.url, 'elapsed_ms': round(elapsed, 1)}
        except Exception as exc:
            seen[url] = {'status': 'ERROR', 'error': str(exc)}
    return seen, sources


def main():
    tool_results = [audit_tool(tool) for tool in TOOLS]
    base_paths = ['/', '/tools', '/about', '/privacy', '/contact']
    category_paths = [f"/categories/{category['slug']}" for category in DATA.get('categories', []) if sum(t['category'] == category['slug'] for t in TOOLS) >= 2]
    all_paths = base_paths + category_paths + [f"/tools/{tool['slug']}" for tool in TOOLS]
    links, sources = audit_links(all_paths)
    response, robots_ms = get('/robots.txt')
    robots = response.text
    response_sitemap, sitemap_ms = get('/sitemap.xml')
    sitemap_urls = re.findall(r'<loc>(.*?)</loc>', response_sitemap.text)
    report = {
        'generated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'base': BASE, 'tool_count': len(TOOLS), 'tool_results': tool_results,
        'all_paths': all_paths, 'links': links,
        'link_sources': {key: value for key, value in sources.items()},
        'broken_links': {key: value for key, value in links.items() if value.get('status') not in (200, 301, 302, 308)},
        'redirected_links': {key: value for key, value in links.items() if value.get('status') in (301, 302, 307, 308) or value.get('final_url') != key},
        'robots': {'status': response.status_code, 'elapsed_ms': round(robots_ms, 1), 'text': robots},
        'sitemap': {'status': response_sitemap.status_code, 'elapsed_ms': round(sitemap_ms, 1), 'count': len(sitemap_urls), 'urls': sitemap_urls},
    }
    Path('/tmp/muhtawaa-seo-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({
        'tool_count': len(TOOLS),
        'tool_statuses': Counter(item['status'] for item in tool_results),
        'missing_title': [item['slug'] for item in tool_results if not item['title']],
        'bad_h1_count': [item['slug'] for item in tool_results if item['h1_count'] != 1],
        'missing_canonical': [item['slug'] for item in tool_results if not item['canonical']],
        'missing_pre_js_text': [item['slug'] for item in tool_results if item['pre_js_text_len'] < 200],
        'empty_app_before_js': [item['slug'] for item in tool_results if item['js_app_empty_before_js']],
        'broken_links': report['broken_links'],
        'sitemap_count': len(sitemap_urls),
        'internal_link_count': len(links),
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
