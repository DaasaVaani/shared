import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";

const schema = JSON.parse(await readFile(new URL("../schemas/search-tables.schema.json", import.meta.url), "utf8"));
const ajv = new Ajv2020({ strict: true });
const inputShape = ajv.compile({ ...schema, $ref: "#/$defs/input" }), tableShape = ajv.compile(schema);
const queryShape = ajv.compile({ ...schema, $ref: "#/$defs/query" });
export const searchFieldCodes = Object.freeze([
  "title", "composer", "ankita", "deity", "tags", "form", "category", "contextLabels", "description", "lyrics"
]);
const fail = message => { throw new Error("Invalid flat search tables: " + message); };
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const lineKey = (item, id) => `${item}:${id}`;
export function assertNormalizedSearchToken(text) {
  if (typeof text !== "string" || !text.length || !text.isWellFormed() ||
      /[\s\u0000-\u001f\u007f-\u009f]/u.test(text)) fail("invalid normalized token text");
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
    assertNormalizedSearchToken(token.text);
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
    assertNormalizedSearchToken(token.text);
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
    assertNormalizedSearchToken(occurrence.text);
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

export function createFlatSearchCandidates(tables) {
  assertFlatSearchTables(tables);
  return candidateLookup(structuredClone(tables));
}

function candidateLookup(snapshot) {
  const profiles = new Map(snapshot.profiles.map((profile, id) => [profile.id, id]));
  const grams = new Map(snapshot.grams.map(gram => [gram.text, gram]));
  const profileTokens = snapshot.profiles.map(() => []);
  snapshot.tokens.forEach((token, id) => profileTokens[token.profile].push(id));
  return query => {
    if (!queryShape(query)) fail("query schema");
    assertNormalizedSearchToken(query.text);
    const profile = profiles.get(query.profileId);
    if (profile === undefined) fail("unknown query profile");
    const text = [...query.text], bounds = [text.length - query.edits,
      text.length - 1 - 3 * query.edits, text.length - 2 - 4 * query.edits];
    let candidates;
    for (let width = 1; width <= 3; width++) {
      const bound = bounds[width - 1];
      if (bound <= 0) continue;
      const counts = new Map(), overlaps = new Map();
      for (let start = 0; start + width <= text.length; start++) {
        const gram = text.slice(start, start + width).join("");
        counts.set(gram, (counts.get(gram) ?? 0) + 1);
      }
      for (const [text, count] of counts) {
        const gram = grams.get(text);
        if (!gram) continue;
        for (let record = gram.postingOffset; record < gram.postingOffset + gram.postingCount; record++) {
          const token = snapshot.postings[record * 2], occurrences = snapshot.postings[record * 2 + 1];
          if (snapshot.tokens[token].profile !== profile || (candidates && !candidates.has(token))) continue;
          overlaps.set(token, (overlaps.get(token) ?? 0) + Math.min(count, occurrences));
        }
      }
      candidates = new Set([...overlaps].filter(([, overlap]) => overlap >= bound).map(([token]) => token));
      if (!candidates.size) return [];
    }
    return [...(candidates ?? profileTokens[profile])].sort((a, b) => a - b);
  };
}

function boundedFragmentWitness(query, token, edits) {
  const ceiling = edits + 1;
  let previous = new Uint8Array(query.length + 1), earlier = new Uint8Array(query.length + 1),
    current = new Uint8Array(query.length + 1);
  let previousStarts = new Float64Array(query.length + 1), earlierStarts = new Float64Array(query.length + 1),
    currentStarts = new Float64Array(query.length + 1), best = null, previousPoint, end = 0;
  for (let i = 0; i <= query.length; i++) previous[i] = Math.min(i, ceiling);
  for (const point of token) {
    end++;
    current[0] = 0;
    currentStarts[0] = end;
    for (let i = 1; i <= query.length; i++) {
      let cost = Math.min(ceiling, previous[i] + 1), start = previousStarts[i];
      let alternative = Math.min(ceiling, current[i - 1] + 1);
      if (alternative < cost || (alternative === cost && currentStarts[i - 1] < start)) {
        cost = alternative;
        start = currentStarts[i - 1];
      }
      alternative = Math.min(ceiling, previous[i - 1] + (query[i - 1] === point ? 0 : 1));
      if (alternative < cost || (alternative === cost && previousStarts[i - 1] < start)) {
        cost = alternative;
        start = previousStarts[i - 1];
      }
      if (i > 1 && previousPoint !== undefined && query[i - 1] === previousPoint && query[i - 2] === point) {
        alternative = Math.min(ceiling, earlier[i - 2] + 1);
        if (alternative < cost || (alternative === cost && earlierStarts[i - 2] < start)) {
          cost = alternative;
          start = earlierStarts[i - 2];
        }
      }
      current[i] = cost;
      currentStarts[i] = start;
    }
    const distance = current[query.length], start = currentStarts[query.length];
    if (distance <= edits && start < end && (!best || distance < best.edits ||
        (distance === best.edits && (start < best.start || (start === best.start && end < best.end))))) {
      best = { edits: distance, start, end };
      if (distance === 0) return best;
    }
    const reusable = earlier;
    earlier = previous;
    previous = current;
    current = reusable;
    const reusableStarts = earlierStarts;
    earlierStarts = previousStarts;
    previousStarts = currentStarts;
    currentStarts = reusableStarts;
    previousPoint = point;
  }
  return best;
}

export function createFlatSearchMatches(tables) {
  const witnesses = createFlatSearchWitnesses(tables);
  return query => witnesses(query).map(({ token, edits }) => ({ token, edits }));
}

export function createFlatSearchWitnesses(tables) {
  assertFlatSearchTables(tables);
  const snapshot = structuredClone(tables), candidates = candidateLookup(snapshot);
  return query => {
    const ids = candidates(query), points = [...query.text], witnesses = [];
    for (const token of ids) {
      const witness = boundedFragmentWitness(points, snapshot.tokens[token].text, query.edits);
      if (witness) witnesses.push({ token, ...witness });
    }
    return witnesses;
  };
}
