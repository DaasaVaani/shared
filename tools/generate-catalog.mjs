import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { parseDocument, visit, isAlias, isScalar } from "yaml";

const root = fileURLToPath(new URL("../", import.meta.url));
export function strictYaml(text) {
  const doc = parseDocument(text, { version: "1.2", uniqueKeys: true, schema: "core" });
  if (doc.errors.length || doc.warnings.length) {
    throw new Error([...doc.errors, ...doc.warnings].map(error => error.message).join("\n"));
  }
  visit(doc, {
    Node(_, node) {
      if (isAlias(node) || node.anchor || node.tag) throw new Error("YAML aliases, anchors and custom tags are not permitted");
    },
    Pair(_, pair) {
      if (!isScalar(pair.key) || typeof pair.key.value !== "string") throw new Error("YAML keys must be strings");
    },
  });
  return doc.toJS({ maxAliasCount: 0, mapAsMap: false });
}
const escape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll("'", "\\'").replaceAll('"', '\\"');

export async function generate() {
  const catalog = strictYaml(await readFile(resolve(root, "locales/ui.yml"), "utf8"));
  const keys = Object.keys(catalog.en).sort();
  for (const [language, messages] of Object.entries(catalog)) {
    if (JSON.stringify(Object.keys(messages).sort()) !== JSON.stringify(keys) ||
        Object.values(messages).some(value => typeof value !== "string" || !value)) {
      throw new Error(`Incomplete UI catalog: ${language}`);
    }
    const folder = resolve(root, "generated/android", language === "en" ? "values" : `values-${language}`);
    await mkdir(folder, { recursive: true });
    await writeFile(resolve(folder, "strings.xml"),
      `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${keys.map(key =>
        `  <string name="${key.replace(/[A-Z]/g, letter => "_" + letter.toLowerCase())}" formatted="false">${escape(messages[key])}</string>`).join("\n")}\n</resources>\n`);
  }
  await mkdir(resolve(root, "generated/web"), { recursive: true });
  await writeFile(resolve(root, "generated/web/ui.json"), JSON.stringify(catalog, null, 2) + "\n");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await generate();
