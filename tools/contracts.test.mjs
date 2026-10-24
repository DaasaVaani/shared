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
test("reading-density defaults require a declared supported mode without coercion or missing fields", async () => {
  const schema = JSON.parse(await readFile(new URL("../schemas/ui-defaults.schema.json", import.meta.url), "utf8"));
  const defaults = strictYaml(await readFile(new URL("../settings/defaults.yml", import.meta.url), "utf8"));
  const validate = new Ajv2020({ strict: true }).compile(schema);
  assert.equal(defaults.readingDensity, "normal");
  assert.deepEqual(defaults.supportedReadingDensities, ["compact", "normal", "relaxed"]);
  for (const readingDensity of defaults.supportedReadingDensities) assert.equal(validate({ ...defaults, readingDensity }), true);
  const { readingDensity, ...missingDefault } = defaults;
  const { supportedReadingDensities, ...missingChoices } = defaults;
  for (const invalid of [missingDefault, missingChoices, { ...defaults, readingDensity: true },
    { ...defaults, readingDensity: "tight" }, { ...defaults, supportedReadingDensities: [] },
    { ...defaults, supportedReadingDensities: ["normal", "normal"] },
    { ...defaults, supportedReadingDensities: ["normal", "tight"] },
    { ...defaults, readingDensity: "normal", supportedReadingDensities: ["compact"] }]) {
    assert.equal(validate(invalid), false);
  }
});
test("Recite captions distinguish lifecycle requests from full recitation and match both platform resources", async () => {
  const source = strictYaml(await readFile(new URL("../locales/ui.yml", import.meta.url), "utf8"));
  const web = JSON.parse(await readFile(new URL("../generated/web/ui.json", import.meta.url), "utf8"));
  const keys = ["recite", "exitRecite", "reciteNotice", "showReadingControls", "hideReadingControls", "keepScreenAwake",
    "screenAwakePending", "screenAwakeActive", "screenAwakeInactive", "screenAwakeReleased", "screenAwakeUnsupported", "screenAwakeFailed"];
  for (const [locale, messages] of Object.entries(source)) {
    const xml = await readFile(new URL(`../generated/android/${locale === "en" ? "values" : `values-${locale}`}/strings.xml`, import.meta.url), "utf8");
    assert.equal(new Set(keys.map(key => messages[key])).size, keys.length);
    for (const key of keys) {
      assert.equal(typeof messages[key], "string"); assert.ok(messages[key].length);
      assert.equal(web[locale][key], messages[key]);
      assert.ok(xml.includes(`<string name="${key.replace(/[A-Z]/g, letter => "_" + letter.toLowerCase())}" formatted="false">`));
    }
  }
  assert.match(source.en.screenAwakeActive, /restrictions/);
  assert.match(source.en.reciteNotice, /current reading preferences/);
  assert.match(source.en.screenAwakeFailed, /retry/);
});
test("list Recite captions distinguish ordered entries and boundaries without claiming durable resume", async () => {
  const source = strictYaml(await readFile(new URL("../locales/ui.yml", import.meta.url), "utf8"));
  const web = JSON.parse(await readFile(new URL("../generated/web/ui.json", import.meta.url), "utf8"));
  const keys = ["reciteList", "previousRecitationEntry", "nextRecitationEntry", "recitationStart",
    "recitationEnd", "emptyRecitation", "listReciteNotice"];
  for (const [locale, messages] of Object.entries(source)) {
    const xml = await readFile(new URL(`../generated/android/${locale === "en" ? "values" : `values-${locale}`}/strings.xml`, import.meta.url), "utf8");
    assert.equal(new Set(keys.map(key => messages[key])).size, keys.length);
    for (const key of keys) {
      assert.equal(typeof messages[key], "string"); assert.ok(messages[key].length);
      assert.equal(web[locale][key], messages[key]);
      assert.ok(xml.includes(`<string name="${key.replace(/[A-Z]/g, letter => "_" + letter.toLowerCase())}" formatted="false">`));
    }
  }
  assert.match(source.en.listReciteNotice, /repeated entries and placeholders/);
  assert.match(source.en.listReciteNotice, /actual content preparation/);
  assert.match(source.kn.listReciteNotice, /\p{Script=Kannada}/u);
  assert.equal(source.en.entryNumber, "Entry {position} of {total}");
});
test("Continue captions distinguish explicit exact occurrence recovery and never promise automatic entry", async () => {
  const source = strictYaml(await readFile(new URL("../locales/ui.yml", import.meta.url), "utf8"));
  const web = JSON.parse(await readFile(new URL("../generated/web/ui.json", import.meta.url), "utf8"));
  const keys = ["continueRecitation", "savedRecitationPosition", "noRecitationPosition", "recitationListMissing",
    "recitationEntryMissing", "recitationPositionNotice", "recitationPositionSaving"];
  for (const [locale, messages] of Object.entries(source)) {
    const xml = await readFile(new URL(`../generated/android/${locale === "en" ? "values" : `values-${locale}`}/strings.xml`, import.meta.url), "utf8");
    assert.equal(new Set(keys.map(key => messages[key])).size, keys.length);
    for (const key of keys) {
      assert.equal(typeof messages[key], "string", `${locale}.${key}`);
      assert.equal(web[locale][key], messages[key]);
      assert.ok(xml.includes(`<string name="${key.replace(/[A-Z]/g, letter => "_" + letter.toLowerCase())}" formatted="false">`));
    }
  }
  assert.match(source.en.recitationPositionNotice, /never starts automatically/);
  assert.match(source.en.recitationListMissing, /Exact resume is unavailable/);
  assert.match(source.en.recitationEntryMissing, /rather than starting at a different one automatically/);
  assert.match(source.kn.continueRecitation, /\p{Script=Kannada}/u);
});
test("learning captions retain all approved states and match both generated platform resources", async () => {
  const source = strictYaml(await readFile(new URL("../locales/ui.yml", import.meta.url), "utf8"));
  const web = JSON.parse(await readFile(new URL("../generated/web/ui.json", import.meta.url), "utf8"));
  const keys = ["learning", "learningLabel", "learningNone", "learningWantToLearn", "learningPractising",
    "learningComfortableReciting", "learningAll", "learningFilter", "learningNotice", "emptyLearning",
    "learningPracticeUnavailable", "learningSaved"];
  for (const [locale, messages] of Object.entries(source)) {
    const xml = await readFile(new URL(`../generated/android/${locale === "en" ? "values" : `values-${locale}`}/strings.xml`, import.meta.url), "utf8");
    assert.equal(new Set(keys.map(key => messages[key])).size, keys.length);
    for (const key of keys) {
      assert.equal(typeof messages[key], "string"); assert.ok(messages[key].length);
      assert.equal(web[locale][key], messages[key]);
      assert.ok(xml.includes(`<string name="${key.replace(/[A-Z]/g, letter => "_" + letter.toLowerCase())}" formatted="false">`));
    }
  }
});
test("canonical discovery captions are distinct and equal in both generated platform resources", async () => {
  const source = strictYaml(await readFile(new URL("../locales/ui.yml", import.meta.url), "utf8"));
  const web = JSON.parse(await readFile(new URL("../generated/web/ui.json", import.meta.url), "utf8"));
  const keys = ["showAnotherLyric", "anotherLyricNotice", "noAnotherLyric"];
  for (const [locale, messages] of Object.entries(source)) {
    const xml = await readFile(new URL(`../generated/android/${locale === "en" ? "values" : `values-${locale}`}/strings.xml`, import.meta.url), "utf8");
    assert.equal(new Set(keys.map(key => messages[key])).size, keys.length);
    for (const key of keys) {
      assert.equal(typeof messages[key], "string"); assert.ok(messages[key].length);
      assert.equal(web[locale][key], messages[key]);
      assert.ok(xml.includes(`<string name="${key.replace(/[A-Z]/g, letter => "_" + letter.toLowerCase())}" formatted="false">`));
    }
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
test("reading captions preserve distinct densities and native-unit placeholders in both platform resources", async () => {
  const source = strictYaml(await readFile(new URL("../locales/ui.yml", import.meta.url), "utf8"));
  const web = JSON.parse(await readFile(new URL("../generated/web/ui.json", import.meta.url), "utf8"));
  const keys = ["readingPreferences", "lyricFontSize", "decreaseLyricFontSize", "increaseLyricFontSize",
    "fontSizeValue", "readingDensity", "densityCompact", "densityNormal", "densityRelaxed"];
  for (const [locale, messages] of Object.entries(source)) {
    const xml = await readFile(new URL(`../generated/android/${locale === "en" ? "values" : `values-${locale}`}/strings.xml`, import.meta.url), "utf8");
    for (const key of keys) {
      assert.equal(typeof messages[key], "string"); assert.ok(messages[key].length);
      assert.equal(web[locale][key], messages[key]);
      assert.ok(xml.includes(`<string name="${key.replace(/[A-Z]/g, letter => "_" + letter.toLowerCase())}" formatted="false">`));
    }
    assert.equal(new Set([messages.densityCompact, messages.densityNormal, messages.densityRelaxed]).size, 3);
    assert.deepEqual(messages.fontSizeValue.match(/\{[^}]+\}/gu)?.sort(), ["{size}", "{unit}"]);
    assert.ok(xml.includes(`<string name="font_size_value" formatted="false">${messages.fontSizeValue}</string>`));
  }
});
test("app-shell captions remain distinct, bilingual and equal in both generated platform resources", async () => {
  const source = strictYaml(await readFile(new URL("../locales/ui.yml", import.meta.url), "utf8"));
  const web = JSON.parse(await readFile(new URL("../generated/web/ui.json", import.meta.url), "utf8"));
  const keys = ["appShell", "appShellNotice", "appShellFailed", "appShellUnsupported", "appUpdateAvailable"];
  for (const [locale, messages] of Object.entries(source)) {
    const xml = await readFile(new URL(`../generated/android/${locale === "en" ? "values" : `values-${locale}`}/strings.xml`, import.meta.url), "utf8");
    assert.equal(new Set(keys.map(key => messages[key])).size, keys.length);
    for (const key of keys) {
      assert.equal(typeof messages[key], "string"); assert.ok(messages[key].length);
      assert.equal(web[locale][key], messages[key]);
      assert.ok(xml.includes(`<string name="${key.replace(/[A-Z]/g, letter => "_" + letter.toLowerCase())}" formatted="false">${messages[key]}</string>`));
    }
  }
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
      if (typeof policy[key] === "number") {
        const ceiling = key === "metadataTimeoutMs" ? 2147483647 : Number.MAX_SAFE_INTEGER;
        assert.equal(validate({ ...policy, [key]: ceiling }), true);
        assert.equal(validate({ ...policy, [key]: ceiling + 1 }), false);
      }
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
