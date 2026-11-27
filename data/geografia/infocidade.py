"""Read legacy Infocidade HTML tables. The publisher serves UTF-8 and Windows-1252 files."""
from html.parser import HTMLParser
from pathlib import Path
import json
import unicodedata
from urllib.request import urlopen

class Rows(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows = []
        self.row = []
        self.cell = None
    def handle_starttag(self, tag, attrs):
        if tag=='tr': self.row=[]
        if tag in {'td','th'}: self.cell=[]
    def handle_data(self, value):
        if self.cell is not None: self.cell.append(value)
    def handle_endtag(self, tag):
        if tag in {'td','th'} and self.cell is not None:
            self.row.append(' '.join(''.join(self.cell).split()))
            self.cell=None
        elif tag=='tr' and self.row:
            self.rows.append(self.row)
            self.row=[]

def rows(url):
    with urlopen(url,timeout=90) as stream:
        raw=stream.read()
    try: html=raw.decode('utf-8-sig')
    except UnicodeDecodeError: html=raw.decode('cp1252',errors='replace')
    parsed=Rows()
    parsed.feed(html)
    return parsed.rows

def normalize(value):
    return ''.join(c for c in unicodedata.normalize('NFD',value.lower()) if 'a'<=c<='z')

def boundaries():
    return json.loads(Path(__file__).with_name('distritos.json').read_text())['districts']
