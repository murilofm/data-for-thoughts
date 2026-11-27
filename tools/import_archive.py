#!/usr/bin/env python3
"""Mirror the author's published WordPress posts to projects/<slug>/post.json.

Run from any directory: python3 tools/import_archive.py
Use --input export.json for a complete WordPress.com v1.1 posts response.
The local data is the source for reading the archive without a network request.
"""

import argparse
import hashlib
import html
import json
import re
import sys
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlencode, urljoin, urlsplit
from urllib.request import Request, urlopen

SITE = "dataforthoughts.wordpress.com"
API = f"https://public-api.wordpress.com/rest/v1.1/sites/{SITE}/posts/"
ROOT = Path(__file__).resolve().parent.parent
MEDIA_HOSTS = {SITE, "dataforthoughts.files.wordpress.com"}
VOID = set("area base br col embed hr img input link meta param source track wbr".split())
TAGS = set("p br em i strong b u s sup sub a h2 h3 h4 h5 ol ul li blockquote pre code table thead tbody tr th td dl dt dd".split())
IGNORE = set("script style noscript template form input button textarea select option object svg".split())
IMAGE_TYPES = {".png", ".jpg", ".jpeg", ".gif", ".webp"}


@dataclass
class Node:
    tag: str
    attrs: dict = field(default_factory=dict)
    children: list = field(default_factory=list)


class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, dict(attrs))
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def http_url(base, value):
    if not value:
        return ""
    url = urljoin(base, value.strip())
    u = urlsplit(url)
    if u.scheme in {"https", "http"} and u.hostname and not (u.username or u.password):
        return url
    return ""


def text_content(node):
    if isinstance(node, str):
        return node
    return "".join(text_content(child) for child in node.children)


def descendants(node):
    if isinstance(node, Node):
        yield node
        for child in node.children:
            yield from descendants(child)


def escaped_link(url, label):
    return f'<a href="{html.escape(url, quote=True)}">{html.escape(label)}</a>'


def media_url(base, src):
    url = http_url(base, src)
    u = urlsplit(url)
    if u.hostname in {"i0.wp.com", "i1.wp.com", "i2.wp.com"}:
        # WordPress's image proxy keeps the origin host/path in its path.
        return http_url(base, "https://" + u.path.lstrip("/"))
    if u.hostname in MEDIA_HOSTS:
        return u._replace(scheme="https", query="", fragment="").geturl()
    return url


def render(node, post, figures, anchor="", caption=""):
    if isinstance(node, str):
        return html.escape(node)
    tag, attrs = node.tag, node.attrs
    classes = set((attrs.get("class") or "").split())
    if tag in IGNORE or classes & {"sharedaddy", "jetpack-likes-widget-wrapper", "contact-form", "wp-caption-text", "contact-form-submission"}:
        return ""
    if tag == "figcaption":
        return ""
    if tag in {"figure", "div"} and (tag == "figure" or "wp-caption" in classes):
        caption = next((text_content(n).strip() for n in descendants(node) if n.tag == "figcaption" or "wp-caption-text" in (n.attrs.get("class") or "").split()), caption)
    if tag == "a":
        anchor = http_url(post["URL"], attrs.get("href"))
    if tag == "img":
        src = media_url(post["URL"], attrs.get("data-orig-file") or attrs.get("src"))
        if not src or str(attrs.get("width")) == "1" or urlsplit(src).hostname in {"pixel.wp.com", "stats.wp.com"}:
            return ""
        alt = attrs.get("alt") or attrs.get("title") or attrs.get("data-image-title") or ""
        if urlsplit(src).hostname not in MEDIA_HOSTS:
            return escaped_link(anchor or src, alt or "Imagem na fonte original")
        figure = {"type": "figure", "src": src, "source": src, "href": anchor or src,
                  "alt": html.unescape(alt), "caption": caption}
        # The marker is replaced after the parent block is rendered.
        figures.append(figure)
        return f"<!--archive-figure-{len(figures) - 1}-->"
    if tag == "iframe":
        link = http_url(post["URL"], attrs.get("src"))
        return escaped_link(link, attrs.get("title") or "Visualização na fonte original") if link else ""
    if tag == "blockquote" and post["slug"] in {"eleicao-presidencial-americana-2012", "passo-a-passo-aeroportos"} and len(text_content(node).split()) > 25:
        return escaped_link(post["URL"], "Leia a citação na publicação original")
    content = "".join(render(child, post, figures, anchor, caption) for child in node.children)
    if tag not in TAGS:
        return content
    if tag == "br":
        return "<br>"
    if not content.strip():
        return ""
    if tag == "a":
        if "<!--archive-figure-" in content or not anchor:
            return content
        return f'<a href="{html.escape(anchor, quote=True)}">{content}</a>'
    return f"<{tag}>{content}</{tag}>"


def blocks(post):
    parser = Tree()
    parser.feed(post["content"])
    parser.close()
    result = []
    for child in parser.root.children:
        figures = []
        fragment = render(child, post, figures)
        # Figures in WordPress often sit inside a paragraph containing no text.
        # Split the surrounding sanitized markup into independently valid blocks.
        stack = []
        pending = []
        for token in re.split(r"(<!--archive-figure-[0-9]+-->|</?[a-z][^>]*>)", fragment):
            if token.startswith("<!--archive-figure-"):
                completed = "".join(pending + [f"</{t}>" for t, _ in reversed(stack)])
                if re.sub(r"<[^>]+>", "", completed).strip():
                    result.append({"type": "html", "html": completed.strip()})
                number = int(token.removeprefix("<!--archive-figure-").removesuffix("-->"))
                result.append(figures[number])
                pending = [opening for _, opening in stack]
            else:
                pending.append(token)
                match = re.match(r"<(/?)([a-z0-9]+)", token)
                if match and match[2] not in VOID:
                    if match[1]:
                        if stack:
                            stack.pop()
                    else:
                        stack.append((match[2], token))
        completed = "".join(pending).strip()
        if re.sub(r"<[^>]+>", "", completed).strip():
            result.append({"type": "html", "html": completed})
    return result


def read_url(url):
    request = Request(url, headers={"User-Agent": "Data-for-thoughts-archive/1.0"})
    with urlopen(request, timeout=45) as response:
        return response.read()


def source_posts(path):
    if path:
        payload = json.loads(path.read_text(encoding="utf8"))
        if payload["found"] != len(payload["posts"]):
            raise ValueError("--input needs the complete posts export")
        return payload["posts"]
    posts = {}
    page = 1
    while True:
        query = urlencode({"number": 100, "page": page, "order_by": "date", "order": "DESC",
                           "fields": "ID,title,date,slug,URL,content,categories"})
        payload = json.loads(read_url(API + "?" + query))
        before = len(posts)
        posts.update((post["ID"], post) for post in payload["posts"])
        if len(posts) == payload["found"]:
            return list(posts.values())
        if len(posts) == before:
            raise ValueError("WordPress pagination did not return all published posts")
        page += 1


def write_atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(dir=path.parent, delete=False) as out:
        out.write(data)
        temp = Path(out.name)
    temp.replace(path)


def local_image(block, folder, root, offline):
    src = block["source"]
    path = Path(unquote(urlsplit(src).path))
    if path.suffix.lower() not in IMAGE_TYPES:
        return
    basename = re.sub(r"[^a-zA-Z0-9_.-]", "-", path.name)
    digest = hashlib.sha256(src.encode()).hexdigest()[:8]
    target = folder / "media" / f"{digest}-{basename}"
    if not target.exists() and not offline:
        try:
            data = read_url(src)
            if not (data.startswith((b"\x89PNG\r\n\x1a\n", b"\xff\xd8\xff", b"GIF87a", b"GIF89a")) or
                    data[:4] == b"RIFF" and data[8:12] == b"WEBP"):
                raise ValueError("response is not an image")
            write_atomic(target, data)
        except (HTTPError, URLError, ValueError, TimeoutError) as error:
            print(f"Keeping original image URL for {src}: {error}", file=sys.stderr)
    if target.is_file():
        block["src"] = target.relative_to(root).as_posix()


def main():
    arg = argparse.ArgumentParser(description=__doc__)
    arg.add_argument("--input", type=Path)
    arg.add_argument("--root", type=Path, default=ROOT)
    arg.add_argument("--remote-images", action="store_true", help="Keep original image URLs when no local copy exists")
    opts = arg.parse_args()
    posts = source_posts(opts.input)
    if not posts:
        raise ValueError("The archive returned no posts")
    for p in posts:
        slug = p["slug"]
        if not re.fullmatch(r"[a-zA-Z0-9_%.-]+", slug) or slug in {".", ".."}:
            raise ValueError(f"Invalid WordPress slug {slug!r}")
        folder = opts.root / "projects" / slug
        post = {"id": p["ID"], "slug": slug, "title": html.unescape(p["title"]), "date": p["date"][:10],
                "url": p["URL"], "categories": sorted(p.get("categories", {})), "blocks": blocks(p)}
        if not post["blocks"]:
            raise ValueError(f"No content recovered for {slug}")
        for block in post["blocks"]:
            if block["type"] == "figure":
                local_image(block, folder, opts.root, opts.remote_images)
        write_atomic(folder / "post.json", (json.dumps(post, ensure_ascii=False, indent=2) + "\n").encode())
        print(f'{slug}: {len(post["blocks"])} blocks')
    print(f"Imported {len(posts)} posts.")


if __name__ == "__main__":
    main()
