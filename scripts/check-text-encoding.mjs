import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const roots = ["apps", "docs", "packages", "scripts"];
const extensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".ts", ".tsx", ".yml", ".yaml"]);
const ignoredDirectories = new Set([".git", ".next", "coverage", "dist", "node_modules", "playwright-report", "test-results"]);
const suspicious = [
  { label: "double-encoded punctuation", pattern: /(?:Â[©®·]|â(?:€|™|€¦|€¢|€“|€”|€™))/u },
  { label: "replacement character", pattern: /\uFFFD/u },
];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(path));
    else if (extensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

const files = (await Promise.all(roots.map(async (directory) => {
  try {
    return await collect(join(root, directory));
  } catch {
    return [];
  }
}))).flat();

const failures = [];
for (const file of files) {
  const content = await readFile(file, "utf8");
  for (const check of suspicious) {
    if (check.pattern.test(content)) failures.push(`${relative(root, file)}: ${check.label}`);
  }
}

if (failures.length) {
  console.error(`Text encoding check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log(`Text encoding check passed (${files.length} files).`);
