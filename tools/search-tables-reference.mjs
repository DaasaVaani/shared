import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";

const schema = JSON.parse(await readFile(new URL("../schemas/search-tables.schema.json", import.meta.url), "utf8"));
const ajv = new Ajv2020({ strict: true });
const inputShape = ajv.compile({ ...schema, $ref: "#/$defs/input" }), tableShape = ajv.compile(schema);
export const searchFieldCodes = Object.freeze([
  "title", "composer", "ankita", "deity", "tags", "form", "category", "contextLabels", "description", "lyrics"
]);
const fail = message => { throw new Error("Invalid flat search tables: " + message); };
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const lineKey = (item, id) => `${item}:${id}`;
function tokenText(text) {
  if (!text.isWellFormed() || /[\s\u0000-\u001f\u007f-\u009f]/u.test(text)) fail("invalid normalized token text");
}
function ordered(values, key) {
  for (let i = 1; i < values.length; i++) if (compare(key(values[i - 1]), key(values[i])) >= 0) fail("dictionary order/duplicate");
}
function profileIdentities(profiles) {
  ordered(profiles, profile => profile.id);
}
function gramTables(tokens) {
  const grams = new Map();
  tokens.forEach((token, tokenId) => {
    tokenText(token.text);
    const text = [...token.text], counts = new Map();
    for (let length = 1; length <= 3; length++) {
      for (let start = 0; start + length <= text.length; start++) {
        const gram = text.slice(start, start + length).join("");
        counts.set(gram, (counts.get(gram) ?? 0) + 1);
      }
    }
    for (const [gram, count] of counts) {
      if (!grams.has(gram)) grams.set(gram, []);
      grams.get(gram).push(tokenId, count);
    }
  });
  const dictionary = [], postings = [];
  for (const text of [...grams.keys()].sort((a, b) => [...a].length - [...b].length || compare(a, b))) {
    const pairs = grams.get(text);
    dictionary.push({ text, postingOffset: postings.length / 2, postingCount: pairs.length / 2 });
    for (const integer of pairs) postings.push(integer);
  }
  return { grams: dictionary, postings };
}

export function assertFlatSearchTables(value) {
  if (!tableShape(value)) fail("schema");
  ordered(value.items, item => item);
  profileIdentities(value.profiles);
  let previousItem = -1, previousLine = "";
  for (const line of value.lines) {
    if (line.item >= value.items.length || line.item < previousItem ||
        (line.item === previousItem && line.lineId <= previousLine)) fail("line dictionary");
    previousItem = line.item;
    previousLine = line.lineId;
  }
  if (value.witnesses.length % 3 || value.postings.length % 2) fail("flat record arity");
  let offset = 0, priorProfile = -1, priorText = "";
  for (const token of value.tokens) {
    tokenText(token.text);
    if (token.profile >= value.profiles.length || token.profile < priorProfile ||
        (token.profile === priorProfile && token.text <= priorText)) fail("token dictionary");
    priorProfile = token.profile;
    priorText = token.text;
    if (token.witnessOffset !== offset || token.witnessCount > value.witnesses.length / 3 - offset) fail("witness extent");
    let prior;
    for (let record = offset; record < offset + token.witnessCount; record++) {
      const triple = value.witnesses.slice(record * 3, record * 3 + 3), [item, field, anchor] = triple;
      if (item >= value.items.length || field >= searchFieldCodes.length ||
          (field === 9 ? anchor < 1 || anchor > value.lines.length || value.lines[anchor - 1].item !== item : anchor !== 0)) {
        fail("witness reference/field");
      }
      if (prior && (item < prior[0] || (item === prior[0] &&
          (field < prior[1] || (field === prior[1] && anchor <= prior[2]))))) fail("witness order/duplicate");
      prior = triple;
    }
    offset += token.witnessCount;
  }
  if (offset !== value.witnesses.length / 3) fail("unowned witnesses");
  const expected = gramTables(value.tokens);
  if (value.grams.length !== expected.grams.length || value.grams.some((gram, index) => {
    const other = expected.grams[index];
    return gram.text !== other.text || gram.postingOffset !== other.postingOffset || gram.postingCount !== other.postingCount;
  }) || value.postings.length !== expected.postings.length ||
      value.postings.some((integer, index) => integer !== expected.postings[index])) fail("incomplete or incorrect counted postings");
}

export function buildFlatSearchTables(input) {
  if (!inputShape(input)) fail("input schema");
  const profiles = structuredClone(input.profiles).sort((a, b) => compare(a.id, b.id)), items = [...input.items].sort(compare);
  profileIdentities(profiles);
  const itemIds = new Map(items.map((id, index) => [id, index]));
  const profileIds = new Map(profiles.map((profile, index) => [profile.id, index]));
  const lines = input.lines.map(line => {
    const item = itemIds.get(line.lyricId);
    if (item === undefined) fail("unknown line item");
    return { item, lineId: line.lineId };
  }).sort((a, b) => a.item - b.item || compare(a.lineId, b.lineId));
  const lineIds = new Map();
  lines.forEach((line, index) => {
    const key = lineKey(line.item, line.lineId);
    if (lineIds.has(key)) fail("duplicate lyric-scoped line");
    lineIds.set(key, index + 1);
  });
  const dictionary = new Map();
  for (const occurrence of input.occurrences) {
    tokenText(occurrence.text);
    const item = itemIds.get(occurrence.lyricId), profile = profileIds.get(occurrence.profileId);
    if (item === undefined || profile === undefined) fail("unknown occurrence item/profile");
    const field = searchFieldCodes.indexOf(occurrence.field);
    let anchor = 0;
    if (field === 9) {
      anchor = lineIds.get(lineKey(item, occurrence.lineId));
      if (anchor === undefined) fail("missing lyric line witness");
    } else if (occurrence.lineId !== null) fail("metadata must not claim lyric line");
    const key = JSON.stringify([profile, occurrence.text]);
    if (!dictionary.has(key)) dictionary.set(key, { profile, text: occurrence.text, witnesses: new Map() });
    const triple = [item, field, anchor];
    dictionary.get(key).witnesses.set(triple.join(","), triple);
  }
  const tokens = [], witnesses = [];
  for (const token of [...dictionary.values()].sort((a, b) => a.profile - b.profile || compare(a.text, b.text))) {
    const triples = [...token.witnesses.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    tokens.push({ profile: token.profile, text: token.text, witnessOffset: witnesses.length / 3, witnessCount: triples.length });
    for (const triple of triples) witnesses.push(...triple);
  }
  const value = { format: "daasavaani-search-tables", formatVersion: 1, policySha256: input.policySha256,
    profiles, items, lines, tokens, witnesses, ...gramTables(tokens) };
  assertFlatSearchTables(value);
  return value;
}
