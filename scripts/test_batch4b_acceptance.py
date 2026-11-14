#!/usr/bin/env python3
"""Batch 4b acceptance: content stability, custom metadata/links, calculations, and sitemap count."""
from pathlib import Path
import json
import re
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = json.loads(subprocess.check_output(['git', 'show', 'origin/main:data/tools.json'], cwd=ROOT, text=True))
CURRENT = json.loads((ROOT / 'data/tools.json').read_text(encoding='utf-8'))
base_tools = {tool['slug']: tool for tool in BASE['tools']}
current_tools = {tool['slug']: tool for tool in CURRENT['tools']}
new_slugs = {
    'length-converter','weight-converter','temperature-converter','area-converter','volume-converter',
    'speed-converter','pressure-converter','energy-converter','data-size-converter','time-unit-converter',
    'percentage-adjustment','percent-of-number','percentage-difference','average-calculator','ratio-proportion-calculator',
    'gcd-lcm-calculator','simple-interest-calculator','compound-interest-calculator',
    'character-counter','case-converter','arabic-diacritics-remover','duplicate-spaces-remover','reverse-text','alphabetize-list','text-compare',
    'date-offset-calculator','business-days-calculator','iso-week-calculator','date-countdown','hijri-days-difference',
}
assert len(new_slugs) == 30 and set(current_tools) == set(base_tools) | new_slugs
allowed_new = {'seoDescription', 'relatedTools', 'pageNote'}
allowed_old_links = {'percentage-calculator', 'discount-calculator'}
for slug, before in base_tools.items():
    after = current_tools[slug]
    allowed = allowed_new if slug in new_slugs else ({'relatedTools'} if slug in allowed_old_links else set())
    before_fixed = {k: v for k, v in before.items() if k not in allowed}
    after_fixed = {k: v for k, v in after.items() if k not in allowed}
    assert before_fixed == after_fixed, f'Unexpected existing text/field change: {slug}'

metas = [current_tools[slug]['seoDescription'] for slug in sorted(new_slugs)]
assert len(set(metas)) == 30, 'Meta descriptions must be unique'
for slug in new_slugs:
    tool = current_tools[slug]
    meta = tool['seoDescription']
    assert 120 <= len(meta) <= 155, f'{slug}: meta length {len(meta)}'
    assert 'استخدم الأداة المجانية للحصول على نتيجة واضحة' not in meta, f'{slug}: shared tail remains'
    assert re.search(r'[0-9٠-٩۰-۹]', meta), f'{slug}: missing a numeric example'
    related = tool['relatedTools']
    assert 3 <= len(related) <= 4 and len(set(related)) == len(related), f'{slug}: related links must be a manual 3–4 list'
    assert all(link in current_tools and link != slug for link in related), f'{slug}: invalid related link'
    page = (ROOT / 'tools' / f'{slug}.html').read_text(encoding='utf-8')
    escaped = meta.replace('&', '&amp;').replace('"', '&quot;')
    assert f'<meta name="description" content="{escaped}">' in page, f'{slug}: generated meta mismatch'
    related_block = page.split('related-section"', 1)[1]
    links = re.findall(r'<a class="tool-card" href="/tools/([^"]+)"', related_block)
    assert links == related, f'{slug}: rendered related tools differ from curated list'

assert {'percent-of-number','percentage-adjustment'} <= set(current_tools['percentage-calculator']['relatedTools'])
assert {'percentage-adjustment','percentage-difference'} <= set(current_tools['discount-calculator']['relatedTools'])
assert len(current_tools['percentage-calculator']['relatedTools']) == 4
assert len(current_tools['discount-calculator']['relatedTools']) == 4

from importlib.util import spec_from_file_location, module_from_spec
for module_path in (ROOT / 'assets/js/tools/date-family.js', ROOT / 'assets/js/tools/converter-family.js'):
    assert module_path.is_file() and module_path.stat().st_size

# Check the visible/default weekend choice and the requested inclusive interval.
date_script = """
const a=require('./assets/js/tools/date-family.js');
const f=a.tools['business-days-calculator'].fields.find(x=>x.id==='weekend');
if(f.value!=='fri-sat') process.exit(2);
const x=a.businessDays('2026-11-15','2026-11-26');
if(x.business!==10||x.total!==12||x.weekend!==2) process.exit(3);
"""
subprocess.run(['node', '-e', date_script], cwd=ROOT, check=True)

# Both unit systems are kept separate and give the defining exact ratios.
convert_script = """
const a=require('./assets/js/tools/converter-family.js');
const dec=a.convert('data-size-converter',{value:'1',from:'GB',to:'MB',system:'decimal'});
const bin=a.convert('data-size-converter',{value:'1',from:'GiB',to:'MiB',system:'binary'});
const fmt=n=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:8}).format(n);
if(dec['النتيجة']!==fmt(1000)+' ميغابايت عشري'||bin['النتيجة']!==fmt(1024)+' ميبيبايت ثنائي') process.exit(4);
if(!a.tools['data-size-converter'].hint.includes('1 GB = 1000 MB')||!a.tools['data-size-converter'].hint.includes('1 GiB = 1024 MiB')) process.exit(5);
try{a.convert('data-size-converter',{value:'1',from:'GB',to:'MB',system:'binary'});process.exit(6)}catch(e){if(!e.message.includes('نظام التحويل المحدد')) process.exit(7)}
"""
subprocess.run(['node', '-e', convert_script], cwd=ROOT, check=True)

page_note = current_tools['data-size-converter'].get('pageNote', '')
assert '1 GB = 1000 MB' in page_note and '1 GiB = 1024 MiB' in page_note
assert page_note in (ROOT / 'tools/data-size-converter.html').read_text(encoding='utf-8')

ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
def sitemap_urls(text):
    root = ET.fromstring(text)
    return {node.findtext('s:loc', namespaces=ns) for node in root.findall('s:url', ns)}
base_sitemap = subprocess.check_output(['git','show','origin/main:sitemap.xml'],cwd=ROOT,text=True)
current_sitemap = (ROOT/'sitemap.xml').read_text(encoding='utf-8')
assert sitemap_urls(base_sitemap) == sitemap_urls(current_sitemap), 'sitemap routes/count changed'
assert len(sitemap_urls(current_sitemap)) == 65
print('PASS: 30 unique 120–155-character meta descriptions; curated 3–4 related links; existing text unchanged; legacy inbound links; 10 inclusive business days; decimal/binary conversions; sitemap remains 65 URLs.')
