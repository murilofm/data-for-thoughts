"""Check reproducibility, the published archive, relative links and source totals."""
import csv
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []
        self.ids = set()
        self.duplicates = []
        self.figures = 0

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if "id" in attrs:
            if attrs["id"] in self.ids:
                self.duplicates.append(attrs["id"])
            self.ids.add(attrs["id"])
        if "data-figure" in attrs:
            self.figures += 1
        for name in ("href","src"):
            url = urlsplit(attrs.get(name) or "")
            if not url.scheme and not url.netloc and url.path:
                self.paths.append(unquote(url.path))


def main():
    projects = ROOT/"projects"
    articles = sorted(projects.glob("*/post.json"))
    if len(articles) != 25:
        raise ValueError("O arquivo histórico deve conter 25 publicações.")
    pages = [ROOT/"index.html"]
    for manifest in projects.glob("*/project.json"):
        if json.loads(manifest.read_text()).get("kind") == "study":
            pages.append(manifest.with_name("index.html"))
    images = set()
    for path in articles:
        post = json.loads(path.read_text())
        folder = path.parent
        if post["slug"] != folder.name or not post["blocks"]:
            raise ValueError(path)
        if not (folder/"README.md").is_file() or not (folder/"project.json").is_file():
            raise ValueError(f"Subprojeto incompleto: {folder.name}")
        for block in post["blocks"]:
            if block["type"] == "figure" and not block["src"].startswith("https://"):
                source = ROOT/block["src"]
                if not source.is_file() or not source.stat().st_size:
                    raise FileNotFoundError(source)
                images.add(source)
        pages.append(folder/"index.html")
    count = 0
    for p in pages:
        html = Links()
        html.feed(p.read_text())
        if html.duplicates:
            raise ValueError((p,html.duplicates))
        for url in html.paths:
            dest = (p.parent/url).resolve()
            if not dest.is_relative_to(ROOT) or not dest.exists():
                raise FileNotFoundError(f"{p.relative_to(ROOT)}: {url}")
        if html.figures:
            assert (p.parent/"view.js").exists(), p
            count += 1
    with (projects/"sao-paulo-distritos/distritos.csv").open() as f:
        data = list(csv.DictReader(f))
    assert len({r["distrito"] for r in data}) == 96
    assert sum(int(r["2010"]) for r in data) == 11253503
    assert sum(int(r["2022"]) for r in data) == 11451999
    assert sum(int(r["2022"]) < int(r["2010"]) for r in data) == 46
    print(f"{len(articles)} publicações históricas, {count} análises interativas, {len(images)} imagens originais e 96 distritos verificados.")


if __name__ == "__main__":
    main()
