import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { strictYaml, generate } from "./generate-catalog.mjs";

test("strict settings reject duplicates, aliases, tags and extra documents", () => {
  for (const value of ["a: 1\na: 2", "a: &x value\nb: *x", "a: !!str x", "a: 1\n---\na: 2", "1: x"]) {
    assert.throws(() => strictYaml(value));
  }
  assert.deepEqual(strictYaml("value: 2\n"), { value: 2 });
  assert.deepEqual(strictYaml('value: "Save &read"\n'), { value: "Save &read" });
});
test("fixture item contract rejects unknown fields and invalid identities", async () => {
  const schema = JSON.parse(await readFile(new URL("../schemas/fixture-item.schema.json", import.meta.url), "utf8"));
  const validate = new Ajv2020({ strict: true }).compile(schema);
  const item = { formatVersion: 1, fixture: true, videoId: "test-only", title: "Test",
    tags: [], lines: [{ id: "10000000-0000-4000-8000-000000000001", text: "ಕನ್ನಡ" }] };
  assert.equal(validate(item), true);
  assert.equal(validate({ ...item, privateDescription: "not public" }), false);
  assert.equal(validate({ ...item, videoId: "../unsafe" }), false);
  assert.equal(validate({ ...item, fixture: false }), false);
});
test("owner-supplied lyric draft headers have independent identity and mandatory review holds without media", async () => {
  const schema = JSON.parse(await readFile(new URL("../schemas/lyric-source-draft.schema.json", import.meta.url), "utf8"));
  const source = JSON.parse(await readFile(new URL("../schemas/lyric-source.schema.json", import.meta.url), "utf8"));
  const validate = new Ajv2020({ strict: true }).addSchema(source, "lyric-source.schema.json").compile(schema);
  const value = { sourceFormat: 2, lyricId: "10000000-0000-4000-8000-000000000001",
    public: { title: "ಕನ್ನಡ", tags: [] },
    provenance: { kind: "owner-supplied", sourceFile: "permitted.txt", sha256: "a".repeat(64), encoding: "utf-8" },
    review: { holdReasons: ["source-import-review"] } };
  assert.equal(validate(value), true);
  for (const invalid of [{ ...value, videoId: "fabricated" }, { ...value, lyricId: "title-derived" },
    { ...value, review: { holdReasons: [] } }, { ...value, public: { title: "bad\nline", tags: [] } },
    { ...value, provenance: { ...value.provenance, sourceFile: "../outside.txt" } },
    { ...value, provenance: { ...value.provenance, owner: "not-supplied" } },
    { ...value, provenance: { ...value.provenance, encoding: "guessed" } }]) {
    assert.equal(validate(invalid), false);
  }
});
test("portable UI defaults and all appearance modes follow the strict schema and declared choices", async () => {
  const schema = JSON.parse(await readFile(new URL("../schemas/ui-defaults.schema.json", import.meta.url), "utf8"));
  const defaults = strictYaml(await readFile(new URL("../settings/defaults.yml", import.meta.url), "utf8"));
  const validate = new Ajv2020({ strict: true }).compile(schema);
  assert.equal(validate(defaults), true);
  assert.equal(defaults.theme, "light");
  assert.equal(defaults.recentHistoryEnabled, true);
  assert.equal(validate({ ...defaults, recentHistoryEnabled: false }), true);
  assert.equal(validate({ ...defaults, recentHistoryEnabled: "true" }), false);
  const { recentHistoryEnabled, ...missingHistoryDefault } = defaults;
  assert.equal(validate(missingHistoryDefault), false);
  assert.deepEqual(defaults.supportedThemes, ["light", "dark", "warm", "device"]);
  for (const theme of defaults.supportedThemes) assert.equal(validate({ ...defaults, theme }), true);
  for (const invalid of [{ ...defaults, ignored: true }, { ...defaults, theme: "unknown" },
    { ...defaults, supportedThemes: [] }, { ...defaults, supportedThemes: ["light", "light"] },
    { ...defaults, theme: "warm", supportedThemes: ["light"] },
    { ...defaults, uiLanguage: "kn", supportedUiLanguages: ["en"] }, { ...defaults, lyricScript: "en" }]) {
    assert.equal(validate(invalid), false);
  }
});
test("catalog generator is deterministic and includes both locales", async () => {
  await generate();
  const file = new URL("../generated/web/ui.json", import.meta.url);
  const first = await readFile(file, "utf8");
  await generate();
  assert.equal(await readFile(file, "utf8"), first);
  assert.deepEqual(Object.keys(JSON.parse(first)), ["en", "kn"]);
});
test("search settings match their exact schema and reject oversized limits", async () => {
  const schema = JSON.parse(await readFile(new URL("../schemas/search-policy.schema.json", import.meta.url), "utf8"));
  const policy = strictYaml(await readFile(new URL("../settings/search.yml", import.meta.url), "utf8"));
  const validate = new Ajv2020({ strict: true }).compile(schema);
  assert.equal(validate(policy), true);
  assert.equal(validate({ ...policy, maxQueryCodePoints: 257 }), false);
  assert.equal(validate({ ...policy, ignoredSetting: true }), false);
  assert.deepEqual(policy.editBands, [{ maxLength: 3, edits: 0 }, { maxLength: 8, edits: 1 }, { maxLength: 256, edits: 2 }]);
});
test("publication safety settings require every typed field without coercion or unknown keys", async () => {
  const schema = JSON.parse(await readFile(new URL("../schemas/publication-policy-settings.schema.json", import.meta.url), "utf8"));
  const policy = strictYaml(await readFile(new URL("../settings/publication-policy.yml", import.meta.url), "utf8"));
  const validate = new Ajv2020({ strict: true }).compile(schema);
  assert.equal(validate(policy), true);
  for (const key of Object.keys(policy)) {
    const missing = { ...policy };
    delete missing[key];
    assert.equal(validate(missing), false, `Missing ${key}`);
    if (key !== "formatVersion" && key !== "supportedRequiredCapabilities") {
      for (const value of [0, -1, 1.5, "1", true, null, Number.MAX_SAFE_INTEGER + 1]) {
        assert.equal(validate({ ...policy, [key]: value }), false, `Invalid ${key}: ${value}`);
      }
      const ceiling = key === "metadataTimeoutMs" ? 2147483647 : Number.MAX_SAFE_INTEGER;
      assert.equal(validate({ ...policy, [key]: ceiling }), true);
      assert.equal(validate({ ...policy, [key]: ceiling + 1 }), false);
    }
  }
  for (const invalid of [{ ...policy, formatVersion: 2 }, { ...policy, ignored: 1 },
    { ...policy, supportedRequiredCapabilities: [] }, { ...policy, supportedRequiredCapabilities: [""] },
    { ...policy, supportedRequiredCapabilities: [1] }, { ...policy, supportedRequiredCapabilities: ["not-implemented"] },
    { ...policy, supportedRequiredCapabilities: ["fixture-catalog-v1", "fixture-catalog-v1"] }]) {
    assert.equal(validate(invalid), false);
  }
});
test("portable personal-transfer bounds are positive safe integers", async () => {
  const settings = strictYaml(await readFile(new URL("../settings/personal-transfer.yml", import.meta.url), "utf8"));
  assert.equal(settings.formatVersion, 1);
  assert.equal(settings.maxFavorites, 10000);
  assert.equal(settings.maxRecents, 50);
  assert.ok(Object.values(settings).every(value => Number.isSafeInteger(value) && value > 0));
  assert.ok(settings.maxListEncodedBytes > settings.maxListDecodedBytes);
  assert.ok(settings.maxBackupEncodedBytes > settings.maxBackupDecodedBytes);
});
