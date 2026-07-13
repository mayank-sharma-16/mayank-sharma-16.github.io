#!/usr/bin/env python3

from pathlib import Path
import shutil
import subprocess
import yaml

ROOT = Path(__file__).parent

SRC = ROOT / "src"
OUT = ROOT / "public"

TEMPLATE = ROOT / "templates" / "page.html"

# --------------------------
# clean output
# --------------------------

if OUT.exists():
    shutil.rmtree(OUT)

OUT.mkdir()

# copy assets

shutil.copy(ROOT / "assets" / "style.css", OUT / "style.css")

# --------------------------
# helper
# --------------------------

def read_frontmatter(path: Path):
    text = path.read_text(encoding="utf-8", errors="ignore")

    if not text.startswith("---"):
        raise RuntimeError(f"{path} has no front matter")

    _, fm, _ = text.split("---", 2)

    return yaml.safe_load(fm)

# --------------------------
# pages
# --------------------------

for page in (SRC / "pages").glob("*.md"):

    name = page.stem

    if name == "index":
        destination = OUT / "index.html"
    else:
        destination = OUT / name / "index.html"
        destination.parent.mkdir(parents=True, exist_ok=True)

    subprocess.run([
        "pandoc",
        str(page),
        "--template",
        str(TEMPLATE),
        "--toc",
        "-o",
        str(destination),
    ], check=True)

# --------------------------
# posts
# --------------------------

posts = []

for post in (SRC / "posts").rglob("*.md"):

    meta = read_frontmatter(post)

    try:
        slug = meta["slug"]
    except KeyError:
        raise KeyError(f"'slug' missing in frontmatter of {post}") from None

    destination = OUT / slug / "index.html"

    destination.parent.mkdir(parents=True, exist_ok=True)

    subprocess.run([
        "pandoc",
        str(post),
        "--template",
        str(TEMPLATE),
        "--toc",
        "-o",
        str(destination),
    ], check=True)

    posts.append(meta)

for page in (SRC / "posts").rglob("*.html"):
    rel = page.relative_to(SRC / "posts")
    dest = OUT / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(page, dest)

print(f"Built {len(posts)} posts.")