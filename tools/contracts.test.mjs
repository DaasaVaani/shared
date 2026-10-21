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
