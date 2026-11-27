"""Build all historical pages from their own project folders using the standard library."""
from collections import defaultdict
from datetime import date
from html import escape
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ROOT / "projects"
REPO = "https://github.com/murilofm/data-for-thoughts"
SITE = "https://murilofm.github.io/data-for-thoughts"
MONTHS = "jan fev mar abr mai jun jul ago set out nov dez".split()


def read(path):
    return path.read_text(encoding="utf-8")


def write(path, value):
    path.write_text(value.rstrip() + "\n", encoding="utf-8")


def date_label(iso):
    d = date.fromisoformat(iso[:10])
    return f"{d.day} {MONTHS[d.month-1]} {d.year}"


def text_block_url(original, slugs):
    # Keep historical URLs in post.json. Link archived sibling articles locally.
    pattern = r'href="https?://dataforthoughts\.wordpress\.com/\d{4}/\d{2}/\d{2}/([\w%-]+)/?"'
    return re.sub(pattern, lambda m: f'href="../{m[1]}/"' if m[1] in slugs else m[0], original)


def original_body(post, slugs):
    parts = []
    for block in post["blocks"]:
        if block["type"] == "html":
            parts.append(text_block_url(block["html"], slugs))
        elif block["type"] == "figure":
            src = block["src"]
            path = escape(src if src.startswith("https://") else "../../" + src, quote=True)
            caption = escape(block.get("caption") or "")
            alt = escape(block.get("alt") or block.get("caption") or "Figura da publicação original", quote=True)
            parts.append(f'<figure><a href="{path}"><img loading="lazy" src="{path}" alt="{alt}"></a><figcaption>{caption}</figcaption></figure>')
    return "\n".join(parts)


def article(post, conf, has_figure, slugs, template):
    slug = post["slug"]
    title = escape(post["title"])
    lead = escape(conf["summary"])
    chart = ""
    if has_figure:
        key = escape(conf["figure"], quote=True)
        chart = f'<section class="research" aria-label="Análise reconstruída" data-figure="{key}"></section>'
    if conf.get("reading"):
        name, context, url = conf["reading"]
        chart = f'<section class="research"><h2>Leitura indicada</h2><p>{escape(context)}</p><a href="{escape(url,quote=True)}">{escape(name)}</a></section>'
    if conf.get("scope"):
        chart += f'<p class="help scope">{escape(conf["scope"])}</p>'
    body = f'''<article class="article"><a class="back" href="../../#arquivo">Voltar ao arquivo</a>
<header class="article-head"><p class="kind">{escape(conf["topic"])} &nbsp; / &nbsp; Arquivo</p><h1>{title}</h1>
<p class="dek">{lead}</p><p class="meta"><time datetime="{post["date"][:10]}">{date_label(post["date"])}</time> &nbsp;·&nbsp; <a href="{REPO}/tree/main/projects/{slug}">Subprojeto no GitHub</a></p></header>
{chart}<section class="paper"><h2>Publicação original</h2>
<div class="source-copy">{original_body(post,slugs)}</div><div class="linkline"><a href="{escape(post["url"],quote=True)}">Ler no WordPress</a></div></section></article>'''
    return template.replace("<!-- TITLE -->",title).replace("<!-- DESCRIPTION -->",escape(conf["summary"],quote=True)).replace("<!-- BODY -->",body)


def project_readme(folder, post, conf, edition):
    slug = post["slug"]
    listed = []
    for item in sorted(folder.iterdir()):
        if item.name in {"README.md", "index.html", "post.json", "project.json", "__pycache__", ".DS_Store"} or item.name.startswith("."):
            continue
        suffix = "/" if item.is_dir() else ""
        listed.append(f"- [{item.name}]({item.name}{suffix})")
    detail = conf.get("scope") or ""
    reading = conf.get("reading")
    if reading:
        detail += f"\n\n[{reading[0]}]({reading[2]})"
    files = "\n".join(listed)
    return f'''# {post["title"]}

[Abrir a publicação]({SITE}/projects/{slug}/) · [Índice de subprojetos](../README.md)

{conf["summary"]}

**Edição publicada** · {edition}

{detail}

## Fontes e arquivos

- [Post original, {date_label(post["date"])}]({post["url"]})
- [Texto, figuras e links preservados](post.json)
- [Configuração editorial](project.json)
- [Página publicada](index.html)
{files}

## Executar

Na raiz do repositório, execute `python3 -m http.server 8000` e abra `http://localhost:8000/projects/{slug}/`. Para gerar as páginas depois de editar as fontes, execute `python3 tools/build.py`.
'''


def main():
    data = []
    for path in sorted(PROJECTS.glob("*/post.json")):
        post = json.loads(read(path))
        slug = path.parent.name
        if post["slug"] != slug:
            raise ValueError(f"Pasta divergente: {slug}")
        conf = json.loads(read(path.with_name("project.json")))
        has_figure = path.with_name("view.js").is_file() and bool(conf.get("figure"))
        if has_figure:
            edition = conf.get("edition", "Visualização reconstruída")
        elif conf.get("reading"):
            edition = "Referência comentada"
        else:
            edition = "Publicação histórica com fontes preservadas"
        data.append((path.parent, post, conf, has_figure, edition))
    if len(data) != 25:
        raise ValueError(f"Esperadas 25 publicações históricas, encontradas {len(data)}")
    data.sort(key=lambda row: (row[1]["date"],row[1]["id"]), reverse=True)
    slugs = {p["slug"] for _, p, _, _, _ in data}
    template = read(ROOT/"templates/article.html")
    years = defaultdict(list)
    index = ["# Subprojetos", "", "Cada publicação tem sua própria página, fontes e arquivos de análise.", "",
             "| Publicação | Subprojeto | Edição publicada |", "| --- | --- | --- |",
             "| 2026-11-27 | [Onde São Paulo cresceu?](sao-paulo-distritos/) | Estudo novo · oito censos, 96 distritos |"]
    for folder, post, conf, has_figure, edition in data:
        slug = post["slug"]
        write(folder/"index.html",article(post,conf,has_figure,slugs,template))
        write(folder/"README.md",project_readme(folder,post,conf,edition))
        topic = escape(conf["topic"])
        years[post["date"][:4]].append(f'''<li class="entry" data-topic="{topic}"><time datetime="{post["date"][:10]}">{date_label(post["date"])}</time>
<div><h4><a href="projects/{slug}/">{escape(post["title"])}</a></h4><p class="tags">{topic} · <a href="{REPO}/tree/main/projects/{slug}">GitHub</a></p></div></li>''')
        title = post["title"].replace("|","–")
        index.append(f'| {post["date"][:10]} | [{title}]({slug}/) | {edition} |')
    sections = [f'<section class="archive-year"><h3>{year}</h3><ul class="entries">{"".join(entries)}</ul></section>' for year,entries in years.items()]
    write(ROOT/"index.html", read(ROOT/"templates/home.html").replace("<!-- POSTS -->","\n".join(sections)))
    write(PROJECTS/"README.md","\n".join(index))
    print(f"{len(data)} páginas históricas, {sum(row[3] for row in data)} com módulos interativos.")


if __name__ == "__main__":
    main()
