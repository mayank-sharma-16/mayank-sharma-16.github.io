from pathlib import Path

# The directory containing this script
ROOT = Path(__file__).resolve().parent

# Output file
OUTPUT = ROOT / "sitemap.txt"


def build_tree(directory, prefix=""):
    entries = sorted(
        [p for p in directory.iterdir() if p.name != OUTPUT.name],
        key=lambda p: (p.is_file(), p.name.lower())
    )

    lines = []

    for index, entry in enumerate(entries):
        is_last = index == len(entries) - 1

        branch = "└── " if is_last else "├── "
        lines.append(prefix + branch + entry.name)

        if entry.is_dir():
            extension = "    " if is_last else "│   "
            lines.extend(
                build_tree(entry, prefix + extension)
            )

    return lines


def main():
    root_name = ROOT.name

    tree = [root_name + "/"]
    tree.extend(build_tree(ROOT))

    with OUTPUT.open("w", encoding="utf-8") as file:
        file.write("\n".join(tree))

    print(f"Sitemap created: {OUTPUT}")


if __name__ == "__main__":
    main()