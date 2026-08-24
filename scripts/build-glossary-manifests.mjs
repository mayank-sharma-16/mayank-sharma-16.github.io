import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

async function filesIn(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const file = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await filesIn(file));
    } else if (entry.isFile() && file.endsWith(".md")) {
      files.push(file);
    }
  }

  return files;
}

function title(md) {
  const match = md.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return "";

  const line = match[1].match(/^title:\s*(.+)$/m);
  return line
    ? line[1].trim().replace(/^["']|["']$/g, "")
    : "";
}

function overview(md) {
  const match = md.match(
    /^#\s*Overview\s*\r?\n([\s\S]*?)(?=^#\s|\s*$)/im
  );

  if (!match) return "";

  return match[1]
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ");
}

function hideTerm(clue, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return clue
    .replace(new RegExp(`\\b${escaped}\\b`, "gi"), "_____")
    .replace(/\s+/g, " ")
    .trim();
}

const sections = await fs.readdir(SRC, {
  withFileTypes: true
});

for (const section of sections) {
  if (!section.isDirectory()) continue;

  const glossary = path.join(
    SRC,
    section.name,
    "glossary"
  );

  try {
    if (!(await fs.stat(glossary)).isDirectory()) continue;
  } catch {
    continue;
  }

  const terms = [];

  for (const file of await filesIn(glossary)) {
    const md = await fs.readFile(file, "utf8");

    const term = title(md);
    const clue = overview(md);

    if (!term || !clue) continue;

    terms.push({
      term,
      clue: hideTerm(clue, term),
      source: path.relative(ROOT, file).replaceAll(path.sep, "/")
    });
  }

  terms.sort((a, b) =>
    a.term.localeCompare(b.term)
  );

  const output = path.join(
    glossary,
    "manifest.json"
  );

  await fs.writeFile(
    output,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        terms
      },
      null,
      2
    ) + "\n"
  );

  console.log(
    `${section.name}: ${terms.length} terms → ${path.relative(ROOT, output)}`
  );
}
