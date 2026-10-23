import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml } from "./generate-catalog.mjs";
import { createTransliterationReference } from "./transliteration-reference.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const schema = JSON.parse(await readFile(resolve(root, "schemas/transliteration-settings.schema.json"), "utf8"));
const validate = new Ajv2020({ strict: true }).compile(schema);

export function validateTransliterationSettings(settings, unicodeData) {
  if (!validate(settings)) throw new Error("Invalid transliteration settings: " + JSON.stringify(validate.errors));
  createTransliterationReference(settings, unicodeData);
  return settings;
}

export async function generateTransliteration() {
  const source = await readFile(resolve(root, "settings/transliteration.yml"));
  if (source.includes(13)) throw new Error("Transliteration settings require LF bytes for portable provenance");
  const unicodeBytes = await readFile(resolve(root, "generated/unicode/unicode16.json"));
  const settings = validateTransliterationSettings(strictYaml(source.toString("utf8")), JSON.parse(unicodeBytes));
  const output = {
    ...settings,
    provenance: {
      settingsSha256: createHash("sha256").update(source).digest("hex"),
      unicodeTablesSha256: createHash("sha256").update(unicodeBytes).digest("hex"),
    },
  };
  const directory = resolve(root, "generated/transliteration");
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, "rules.json"), JSON.stringify(output, null, 2) + "\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateTransliteration();
}
