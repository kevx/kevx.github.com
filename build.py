#!/usr/bin/env python3

import csv
import markdown
import os,sys,json

f = open('tpl-config.json')
cfg = json.loads(f.read())
f.close()

source_csv = '/mnt/d/documents/BNC_COCA_lists.csv'
resource_js = 'data/bnc-coa-4k-10k.js'
level_map = {
    '4k': '4000',
    '5k': '5000',
    '6k': '6000',
    '7k': '7000',
    '8k': '8000',
    '9k': '9000',
    '10k': '10000',
}


def build_word_resource():
    if not os.path.exists(source_csv):
        print('source csv not found, skipping word resource extraction')
        return

    lists = {value: [] for value in level_map.values()}
    with open(source_csv, newline='', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        next(reader, None)
        for row in reader:
            if not row or len(row) < 2:
                continue
            level = row[0].strip()
            headword = row[1].strip()
            mapped_level = level_map.get(level)
            if mapped_level and headword:
                lists[mapped_level].append(headword)

    payload = {
        'levelOrder': list(level_map.values()),
        'levelLabels': {value: value for value in level_map.values()},
        'lists': lists,
    }

    with open(resource_js, 'w', encoding='utf-8') as f:
        f.write('window.BNC_COA_DATA = ' + json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + ';\n')

    print('building word resource')


build_word_resource()


pages = sorted(cfg['items'], key=lambda item: item['created'], reverse=True)
files = [fname for fname in os.listdir('data') if fname.endswith('.md')]

#stage 1: build details
print('building detail pages')

f = open('tpl-detail.html')
tpl_detail = f.read()
f.close()

for fname in files:
    fid = fname[:-3]
    dst = 'detail/' + fid + '.html'
    if os.path.exists(dst): continue

    f = open('data/' + fname)
    html = markdown.markdown(f.read())
    f.close()
    final_html = tpl_detail.replace('$TITLE', fid).replace('<div id="main"></div>', html)
    f = open(dst, 'wb+')
    f.write(final_html.encode('UTF-8'))
    f.close()

#stage 2: build index
print('building index pages')

f = open('tpl-index.html')
tpl_index = f.read()
f.close()

mainhtml = ''
for page in pages:
    title = page['title'] + '<span style="color: gray; font-size: smaller;">&nbsp;&mdash;&nbsp;%s</span>'%(page['created'])
    mainhtml =  mainhtml + '<h4><a href="/detail/%s.html">'%(page['id']) + title + '</a></h4>\n'

final_html = tpl_index.replace('<div id="main"></div>', mainhtml)
f = open('index.html', 'wb+')
f.write(final_html.encode('UTF-8'))
f.close()

#stage 3: build sitemap
f = open('sitemap.xml', 'w')
f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
f.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
for page in pages:
    f.write('<url>\n')
    f.write('  <loc>https://kevx.github.io/detail/%s.html</loc>\n'%(page['id']))
    f.write('  <lastmod>%s</lastmod>\n'%(page['created'].replace('/', '-')))
    f.write('</url>\n')
f.write('</urlset>\n')
f.close()

print('done!')
