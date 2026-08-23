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

/**
 * Recursively find all markdown files in a directory.
 *
 * Generated index.md files are excluded.
 */
function getMarkdownFiles(directory) {
  const files = [];

  function walk(currentDirectory) {
    const entries = fs.readdirSync(currentDirectory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;

      const entryPath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }

      if (
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".md") &&
        entry.name.toLowerCase() !== "index.md"
      ) {
        files.push(entryPath);
      }
    }
  }

  walk(directory);

  return files;
}

/**
 * Return the 20 most recently modified markdown files
 * anywhere inside the current directory.
 */
function getRecentlyModifiedFiles(directory, limit = 20) {
  return getMarkdownFiles(directory)
    .map((filePath) => {
      const stats = fs.statSync(filePath);

      return {
        filePath,
        modifiedTime: stats.mtimeMs,
      };
    })
    .sort((a, b) => b.modifiedTime - a.modifiedTime)
    .slice(0, limit)
    .map((entry) => entry.filePath);
}

/**
 * Sort files alphabetically by title.
 */
function sortFilesAlphabetically(files) {
  return [...files].sort((a, b) =>
    getTitle(a).localeCompare(getTitle(b), undefined, {
      sensitivity: "base",
    }),
  );
}

/**
 * Return the alphabetical group for a page.
 *
 * Files beginning with A-Z are grouped accordingly.
 * Everything else goes under "#".
 */
function getAlphabeticalGroup(filePath) {
  const title = getTitle(filePath).trim();
  const firstCharacter = title.charAt(0).toUpperCase();

  if (firstCharacter >= "A" && firstCharacter <= "Z") {
    return firstCharacter;
  }

  return "#";
}

function getLetterAnchor(letter) {
  return `letter-${letter.toLowerCase()}`;
}

/**
 * Generate the horizontal alphabet navigation bar.
 */
function getAlphabetBar(groups) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const availableLetters = new Set(groups.keys());

  const links = [];

  if (availableLetters.has("#")) {
    links.push(
      `<a class="alphabet-letter" href="#${getLetterAnchor("#")}">#</a>`,
    );
  }

  for (const letter of letters) {
    if (availableLetters.has(letter)) {
      links.push(
        `<a class="alphabet-letter" href="#${getLetterAnchor(letter)}">${letter}</a>`,
      );
    } else {
      links.push(
        `<span class="alphabet-letter alphabet-letter-disabled">${letter}</span>`,
      );
    }
  }

  return [
    '<div class="alphabet-bar">',
    ...links,
    "</div>",
    "",
    "<style>",
    ".alphabet-bar {",
    "  display: flex;",
    "  flex-wrap: nowrap;",
    "  gap: 0.35rem;",
    "  overflow-x: auto;",
    "  position: sticky;",
    "  top: 0;",
    "  z-index: 10;",
    "  padding: 0.75rem 0;",
    "  margin: 0 0 1.5rem;",
    "  background: var(--background, white);",
    "  scrollbar-width: thin;",
    "}",
    "",
    ".alphabet-letter {",
    "  display: inline-flex;",
    "  align-items: center;",
    "  justify-content: center;",
    "  min-width: 2rem;",
    "  height: 2rem;",
    "  padding: 0 0.4rem;",
    "  border-radius: 0.35rem;",
    "  text-decoration: none;",
    "  font-weight: 600;",
    "}",
    "",
    ".alphabet-letter-disabled {",
    "  opacity: 0.3;",
    "  cursor: default;",
    "}",
    "",
    ".alphabet-letter:not(.alphabet-letter-disabled):hover {",
    "  background: rgba(127, 127, 127, 0.15);",
    "}",
    "",
    "html {",
    "  scroll-behavior: smooth;",
    "}",
    "</style>",
  ].join("\n");
}

function generateIndex(directory) {
  const entries = getEntries(directory);

  /*
   * DIRECT SUBFOLDERS
   *
   * These are listed first and independently from the
   * recently-modified file list.
   */
  const folders = entries.filter((entry) => entry.isDirectory());

  /*
   * DIRECT FILES
   *
   * These are used for the alphabetical Pages section.
   */
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
  ];

  /*
   * ============================================================
   * FOLDERS
   * ============================================================
   *
   * Only direct subfolders are listed here.
   */
  if (folders.length > 0) {
    lines.push("## Folders", "");

    for (const folder of folders) {
      const folderPath = path.join(directory, folder.name);
      const folderTitle = getDirectoryTitle(folderPath);
      const folderUrl = getDirectoryUrl(folderPath);

      lines.push(`- [${folderTitle}](${folderUrl})`);
    }

    lines.push("");
  }

  /*
   * ============================================================
   * RECENTLY MODIFIED
   * ============================================================
   *
   * This is completely separate from the folder list.
   *
   * It searches recursively through the CURRENT folder and
   * returns the 20 most recently modified markdown files.
   */
  const recentFiles = getRecentlyModifiedFiles(directory, 20);

  if (recentFiles.length > 0) {
    lines.push("## Recently Modified", "");

    for (const filePath of recentFiles) {
      const fileTitle = getTitle(filePath);
      const url = getPageUrl(filePath);

      lines.push(`- [${fileTitle}](${url})`);
    }

    lines.push("");
  }

  /*
   * ============================================================
   * PAGES
   * ============================================================
   *
   * Only direct markdown files in the current directory are
   * included here.
   */
  if (pages.length > 0) {
    lines.push("## Pages", "");

    const sortedPages = sortFilesAlphabetically(
      pages.map((page) => path.join(directory, page.name)),
    );

    const groups = new Map();

    for (const filePath of sortedPages) {
      const letter = getAlphabeticalGroup(filePath);

      if (!groups.has(letter)) {
        groups.set(letter, []);
      }

      groups.get(letter).push(filePath);
    }

    /*
     * Horizontal alphabet navigation.
     */
    lines.push(getAlphabetBar(groups), "");

    /*
     * "#" group.
     */
    if (groups.has("#")) {
      lines.push(
        `<a id="${getLetterAnchor("#")}"></a>`,
        "### #",
        "",
      );

      for (const filePath of groups.get("#")) {
        const fileTitle = getTitle(filePath);
        const url = getPageUrl(filePath);

        lines.push(`- [${fileTitle}](${url})`);
      }

      lines.push("");
    }

    /*
     * A-Z groups.
     */
    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      if (!groups.has(letter)) continue;

      lines.push(
        `<a id="${getLetterAnchor(letter)}"></a>`,
        `### ${letter}`,
        "",
      );

      for (const filePath of groups.get(letter)) {
        const fileTitle = getTitle(filePath);
        const url = getPageUrl(filePath);

        lines.push(`- [${fileTitle}](${url})`);
      }

      lines.push("");
    }
  }

  fs.writeFileSync(indexPath, lines.join("\n"), "utf8");

  console.log(
    `Generated: ${path.relative(process.cwd(), indexPath)}`,
  );

  /*
   * Generate indexes for every subfolder.
   */
  for (const folder of folders) {
    generateIndex(path.join(directory, folder.name));
  }
}

generateIndex(CONTENT_ROOT);

console.log("\nIndex generation complete.");
