#!/usr/bin/env python3
"""Batch 4 acceptance checks: unchanged existing tools, content floor, similarity, module coverage."""
from itertools import combinations
from pathlib import Path
import json, re, subprocess, sys, unicodedata
ROOT=Path(__file__).resolve().parents[1]

def load_main_registry():
    raw=subprocess.check_output(['git','show','origin/main^:data/tools.json'],cwd=ROOT,text=True)
    return json.loads(raw)

def article_text(tool):
    return ' '.join([
        tool.get('intro',''),tool.get('howWeCalculate',''),tool.get('formula',''),
        *tool.get('howTo',[]),
        *[item.get('title','')+' '+item.get('text','') for item in tool.get('examples',[])],
        *tool.get('notes',[]),*[q+' '+a for q,a in tool.get('faq',[])],
    ])
def tokens(text):
    text=''.join(c for c in unicodedata.normalize('NFKD',text.lower()) if not unicodedata.combining(c))
    text=text.replace('ـ','').translate(str.maketrans({'أ':'ا','إ':'ا','آ':'ا','ى':'ي'}))
    return re.findall(r'[\w]+',text,flags=re.UNICODE)
def shingles(text,n=4):
    words=tokens(text)
    return set(zip(*(words[i:] for i in range(n)))) if len(words)>=n else {tuple(words)}

def main():
    baseline=load_main_registry();current=json.loads((ROOT/'data/tools.json').read_text(encoding='utf-8'))
    old={t['slug']:t for t in baseline['tools']};all_tools={t['slug']:t for t in current['tools']}
    assert len(old)==25,f'Expected 25 baseline tools; found {len(old)}'
    assert len(all_tools)==55,f'Expected 55 total tools; found {len(all_tools)}'
    allowed_old_links={'percentage-calculator','discount-calculator'}
    assert all(
        {key:value for key,value in all_tools.get(slug,{}).items() if not (slug in allowed_old_links and key=='relatedTools')}
        == {key:value for key,value in tool.items() if not (slug in allowed_old_links and key=='relatedTools')}
        for slug,tool in old.items()
    ),'Unexpected pre-existing tool record/content change.'
    new={slug:tool for slug,tool in all_tools.items() if slug not in old}
    assert len(new)==30,f'Expected 30 new tools; found {len(new)}'
    for slug,tool in new.items():
        text=article_text(tool);count=len(text.split())
        assert count>=250,f'{slug} has only {count} content words.'
        assert tool.get('contentWordCount')==count,f'{slug} contentWordCount does not match its text ({tool.get("contentWordCount")} vs {count}).'
        assert len(tool.get('faq',[]))==6 and len({q.casefold() for q,_ in tool['faq']})==6,f'{slug} must have six distinct FAQs.'
        assert len(tool.get('howTo',[]))==3 and len(tool.get('examples',[]))==3 and len(tool.get('notes',[]))==3,f'{slug} is missing a three-item content section.'
    pages={slug:shingles(article_text(tool)) for slug,tool in all_tools.items()}
    worst=(0,None,None)
    for a,b in combinations(all_tools,2):
        A,B=pages[a],pages[b];union=A|B;score=len(A&B)/len(union) if union else 0
        if score>worst[0]:worst=(score,a,b)
    assert worst[0]<=0.20,f'Content similarity {worst[0]:.1%} exceeds 20%: {worst[1]} vs {worst[2]}'
    family_map={
      'converter-family.js':('length-converter','weight-converter','temperature-converter','area-converter','volume-converter','speed-converter','pressure-converter','energy-converter','data-size-converter','time-unit-converter'),
      'math-family.js':('percentage-adjustment','percent-of-number','percentage-difference','average-calculator','ratio-proportion-calculator','gcd-lcm-calculator','simple-interest-calculator','compound-interest-calculator'),
      'text-family.js':('character-counter','case-converter','arabic-diacritics-remover','duplicate-spaces-remover','reverse-text','alphabetize-list','text-compare'),
      'date-family.js':('date-offset-calculator','business-days-calculator','iso-week-calculator','date-countdown','hijri-days-difference'),
    }
    assigned=set()
    for file,slugs in family_map.items():
        source=(ROOT/'assets/js/tools'/file).read_text(encoding='utf-8')
        assert 'https://' not in source and 'http://' not in source and 'sendBeacon' not in source and 'XMLHttpRequest' not in source and 'WebSocket' not in source,f'{file} contains an external/network API.'
        assigned.update(slugs)
    assert assigned==set(new),f'Family module coverage mismatch: missing {set(new)-assigned}, extra {assigned-set(new)}'
    print(f'PASS: {len(old)} existing tools unchanged; {len(new)} new tools; minimum content {min(len(article_text(t).split()) for t in new.values())} words; maximum 4-word-shingle Jaccard {worst[0]:.2%} ({worst[1]} / {worst[2]}).')
if __name__=='__main__':
    try:main()
    except Exception as exc:
        print('BATCH 4 QUALITY FAILED:',exc,file=sys.stderr);sys.exit(1)
