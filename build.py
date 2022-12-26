#!/usr/bin/env python3

import markdown
import os,sys,json

f = open('tpl-config.json')
cfg = json.loads(f.read())
f.close()


pages = sorted(cfg['items'], key=lambda item: item['created'], reverse=True)
files = os.listdir('data')

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

print('done!')
