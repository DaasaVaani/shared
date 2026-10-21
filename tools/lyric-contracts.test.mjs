import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";

const source = JSON.parse(await readFile(new URL("../schemas/lyric-source.schema.json", import.meta.url), "utf8"));
const publication = JSON.parse(await readFile(new URL("../schemas/lyric-publication.schema.json", import.meta.url), "utf8"));
const uuid = "10000000-0000-4000-8000-000000000001";
const reference = { sha256: "a".repeat(64), path: `objects/${"a".repeat(64)}.json.gz`, encodedBytes: 100, decodedBytes: 200 };
test("source publication headers permit explicitly released holds without weakening draft or provenance rules", () => {
  const validate = new Ajv2020({ strict: true }).compile(source);
  const value = { sourceFormat: 2, lyricId: uuid, public: { title: "ಕನ್ನಡ", tags: [] },
    provenance: { kind: "owner-supplied", sourceFile: "permitted.txt", sha256: "b".repeat(64), encoding: "utf-8" },
    review: { holdReasons: [] } };
  assert.equal(validate(value), true);
  assert.equal(validate({ ...value, review: { holdReasons: ["still-held"] } }), true);
  for (const invalid of [{ ...value, videoId: "fake" }, { ...value, sourceFormat: 3 },
    { ...value, provenance: { ...value.provenance, license: "invented" } },
    { ...value, review: { holdReasons: [false] } }, { ...value, lyricId: "video-id" }]) {
    assert.equal(validate(invalid), false);
  }
});
test("real canonical lyric objects have UUID identities and explicit literal layout, never fixture video fields", () => {
  const validate = new Ajv2020({ strict: true }).compile({ ...publication, $ref: "#/$defs/item" });
  const item = { format: "daasavaani-lyric", formatVersion: 1, lyricId: uuid, canonicalScript: "kn",
    title: "ಕನ್ನಡ", tags: [], lines: [{ kind: "line", lineId: uuid, text: "ಕನ್ನಡ  " }, { kind: "layout", text: " \t " }] };
  assert.equal(validate(item), true);
  for (const invalid of [{ ...item, videoId: "fake" }, { ...item, fixture: true }, { ...item, provenance: {} },
    { ...item, sourceLatin: "not reviewed" }, { ...item, lyricId: "test-only" }, { ...item, formatVersion: 2 },
    { ...item, lines: [{ kind: "layout", lineId: uuid, text: "" }] },
    { ...item, lines: [{ kind: "layout", text: "not layout" }] },
    { ...item, lines: [{ kind: "line", lineId: "missing", text: "ಕನ್ನಡ" }] }]) {
    assert.equal(validate(invalid), false);
  }
});
test("prelaunch descriptors and catalog explicitly identify capabilities and bounded hash-addressed objects", () => {
  const ajv = new Ajv2020({ strict: true });
  const descriptor = ajv.compile(publication);
  assert.equal(descriptor({ format: "daasavaani-lyrics", formatVersion: 1, manifest: reference }), true);
  assert.equal(descriptor({ formatVersion: 1, fixture: true, manifest: reference }), false);
  for (const invalid of [{ ...reference, path: "../private" }, { ...reference, encodedBytes: 0 },
    { ...reference, decodedBytes: 1.5 }, { ...reference, sha256: "bad" }, { ...reference, credentials: true }]) {
    assert.equal(descriptor({ format: "daasavaani-lyrics", formatVersion: 1, manifest: invalid }), false);
  }
  const validate = ajv.compile({ ...publication, $ref: "#/$defs/manifest" });
  const manifest = { format: "daasavaani-lyric-catalog", formatVersion: 1, stage: "prelaunch",
    requiredCapabilities: ["lyric-preview-v1"], catalog: [{ lyricId: uuid, title: "ಕನ್ನಡ", tags: [], item: reference }] };
  assert.equal(validate(manifest), true);
  for (const invalid of [{ ...manifest, stage: "production" }, { ...manifest, requiredCapabilities: [] },
    { ...manifest, requiredCapabilities: ["unknown"] }, { ...manifest, requiredCapabilities: ["fixture-catalog-v1"] },
    { ...manifest, catalog: [] }, { ...manifest, privateSource: "not public" }]) assert.equal(validate(invalid), false);
});
