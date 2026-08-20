import fs from "node:fs";
import path from "node:path";

const CONTENT_ROOT = path.resolve("src");

function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  if (!content.startsWith("---")) return {};

  const end = content.indexOf("\n---", 3);
  if (end === -1) return {};

  const frontmatter = content.slice(4, end);
  const result = {};

  for (const line of frontmatter.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;

    const [, key, value] = match;
    result[key] = value.trim().replace(/^["']|["']$/g, "");
  }

  return result;
}

function slugify(value) {
  return value
    .replace(/\.md$/i, "")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

// URL is ALWAYS derived from the filesystem.
// Frontmatter permalink/slug is deliberately ignored.
function getPageUrl(filePath) {
  const relativePath = path.relative(CONTENT_ROOT, filePath);

  const parts = relativePath
    .split(path.sep)
    .filter(Boolean);

  // index.md represents its containing directory.
  if (parts.at(-1)?.toLowerCase() === "index.md") {
    parts.pop();
  }

  return "/" + parts.map(slugify).filter(Boolean).join("/");
}

function getDirectoryUrl(directory) {
  const relativePath = path.relative(CONTENT_ROOT, directory);

  if (!relativePath) return "/";

  return (
    "/" +
    relativePath
      .split(path.sep)
      .filter(Boolean)
      .map(slugify)
      .filter(Boolean)
      .join("/")
  );
}

function getTitle(filePath) {
  const frontmatter = parseFrontmatter(filePath);

  if (frontmatter.title) {
    return frontmatter.title;
  }

  return path
    .basename(filePath, path.extname(filePath))
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getDirectoryTitle(directory) {
  const indexPath = path.join(directory, "index.md");

  if (fs.existsSync(indexPath)) {
    const frontmatter = parseFrontmatter(indexPath);

    if (frontmatter.title) {
      return frontmatter.title;
    }
  }

  return path
    .basename(directory)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getEntries(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => {
      if (entry.name.startsWith(".")) return false;

      // Generated index is not listed as a child page.
      if (
        entry.isFile() &&
        entry.name.toLowerCase() === "index.md"
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      }),
    );
}

function generateIndex(directory) {
  const entries = getEntries(directory);

  const folders = entries.filter((entry) => entry.isDirectory());

  const pages = entries.filter(
    (entry) =>
      entry.isFile() &&
      entry.name.toLowerCase().endsWith(".md"),
  );

  const indexPath = path.join(directory, "index.md");
  const title = getDirectoryTitle(directory);

  const lines = [
    "---",
    `title: ${title}`,
    "---",
    "",
    `# ${title}`,
    "",
  ];

  if (folders.length > 0) {
    lines.push("## Folders", "");

    for (const folder of folders) {
      const folderPath = path.join(directory, folder.name);
      const folderTitle = getDirectoryTitle(folderPath);
      const url = getDirectoryUrl(folderPath);

      lines.push(`- [${folderTitle}](${url})`);
    }

    lines.push("");
  }

  if (pages.length > 0) {
    lines.push("## Pages", "");

    for (const page of pages) {
      const pagePath = path.join(directory, page.name);
      const title = getTitle(pagePath);
      const url = getPageUrl(pagePath);

      lines.push(`- [${title}](${url})`);
    }

    lines.push("");
  }

  fs.writeFileSync(indexPath, lines.join("\n"), "utf8");

  console.log(
    `Generated: ${path.relative(process.cwd(), indexPath)}`,
  );

  for (const folder of folders) {
    generateIndex(path.join(directory, folder.name));
  }
}

generateIndex(CONTENT_ROOT);

console.log("\nIndex generation complete.");
