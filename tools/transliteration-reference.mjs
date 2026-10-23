import { createUnicodeReference } from "./unicode-reference.mjs";

export class TransliterationError extends Error {
  constructor(code, message, offset) {
    super(message);
    this.name = "TransliterationError";
    this.code = code;
    if (offset !== undefined) this.offset = offset;
  }
}

const fail = (code, message, offset) => { throw new TransliterationError(code, message, offset); };
const scalarString = value => {
  if (typeof value !== "string" || Array.from(value).some(char => {
    const cp = char.codePointAt(0);
    return cp >= 0xd800 && cp <= 0xdfff;
  })) fail("INVALID_TEXT", "Expected a Unicode scalar string");
  return value;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Publisher-tooling reference only; not a consumer runtime or linguistic oracle.
export function createTransliterationReference(input, unicodeData) {
  const rules = structuredClone(input);
  if (rules.formatVersion !== 1 || rules.rulesId !== "kannada-latin-provisional-v1" ||
      rules.status !== "provisional-owner-review" || rules.sourceScript !== "kn" ||
      rules.unicodeProfile !== unicodeData.profile || !Number.isSafeInteger(rules.revision) ||
      rules.revision < 1) fail("INVALID_RULES", "Unsupported provisional rules identity");
  const unicode = createUnicodeReference(unicodeData);
  const alphabet = rules.alphabet;
  if (!alphabet || !Array.isArray(rules.profiles) || rules.profiles.length !== 5 ||
      new Set(rules.profiles.map(p => p.id)).size !== 5 ||
      !["iso15919", "iast-kn", "baraha-kn", "itrans-kn", "harvard-kyoto-kn"].every(id =>
        rules.profiles.some(p => p.id === id))) fail("INVALID_RULES", "Invalid profile inventory");
  const groups = [alphabet.vowels, alphabet.vowelSigns, alphabet.consonants, alphabet.marks];
  const sizes = [16, 16, 34, 4];
  if (groups.some((group, i) => !Array.isArray(group) || group.length !== sizes[i]) ||
      alphabet.vowelSigns[0] !== null || alphabet.vowelSigns.slice(1).some(x => x === null)) {
    fail("INVALID_RULES", "Invalid alphabet dimensions");
  }
  const sourceTokens = [...groups.flat().filter(x => x !== null), alphabet.virama,
    ...Array.from(scalarString(alphabet.digits)), ...Array.from(scalarString(alphabet.asciiDigits)),
    ...Array.from(scalarString(alphabet.passthrough))];
  if (sourceTokens.some(x => Array.from(scalarString(x)).length !== 1 || unicode.nfc(x) !== x) ||
      new Set(sourceTokens).size !== sourceTokens.length ||
      Array.from(alphabet.digits).length !== 10 || alphabet.asciiDigits !== "0123456789") {
    fail("INVALID_RULES", "Alphabet must have distinct NFC scalars and ten digits");
  }
  for (const profile of rules.profiles) {
    for (const [key, size] of [["vowels", 16], ["consonants", 34], ["marks", 4]]) {
      if (!Array.isArray(profile[key]) || profile[key].length !== size ||
          profile[key].some(token => !scalarString(token).length ||
            /[\u0000-\u0020\u007f-\u009f]/u.test(token))) {
        fail("INVALID_RULES", "Missing, empty or control-containing mapping");
      }
    }
  }
  const vowels = new Map(alphabet.vowels.map((char, i) => [char, i]));
  const signs = new Map(alphabet.vowelSigns.slice(1).map((char, i) => [char, i + 1]));
  const consonants = new Map(alphabet.consonants.map((char, i) => [char, i]));
  const marks = new Map(alphabet.marks.map((char, i) => [char, i]));
  const digits = new Map(Array.from(alphabet.digits, (char, i) => [char, alphabet.asciiDigits[i]]));
  const passthrough = new Set(alphabet.passthrough + alphabet.asciiDigits);
  function profileFor(id) {
    const profile = rules.profiles.find(p => p.id === id);
    if (!profile) fail("UNSUPPORTED_PROFILE", `Unsupported output profile: ${String(id)}`);
    return profile;
  }
  function textFor(text, profile) {
    const chars = Array.from(unicode.nfc(scalarString(text)));
    const out = [];
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      if (consonants.has(char)) {
        out.push(profile.consonants[consonants.get(char)]);
        if (chars[i + 1] === alphabet.virama) i++;
        else if (signs.has(chars[i + 1])) out.push(profile.vowels[signs.get(chars[++i])]);
        else out.push(profile.vowels[0]);
      } else if (vowels.has(char)) out.push(profile.vowels[vowels.get(char)]);
      else if (marks.has(char)) out.push(profile.marks[marks.get(char)]);
      else if (digits.has(char)) out.push(digits.get(char));
      else if (passthrough.has(char)) out.push(char);
      else fail(signs.has(char) || char === alphabet.virama ? "ORPHAN_SIGN" : "UNSUPPORTED_SCALAR",
        `Cannot convert U+${char.codePointAt(0).toString(16).toUpperCase()}`, i);
    }
    return unicode.nfc(out.join(""));
  }
  const envelope = profile => ({
    rulesId: rules.rulesId, revision: rules.revision,
    status: rules.status, profileId: profile.id,
  });
  return {
    convertText(text, profileId) {
      const profile = profileFor(profileId);
      return { ...envelope(profile), text: textFor(text, profile) };
    },
    convertLayout(lines, verses, profileId) {
      const profile = profileFor(profileId);
      if (!Array.isArray(lines) || !Array.isArray(verses)) fail("INVALID_LAYOUT", "Expected line and verse arrays");
      const lineIds = [];
      const converted = lines.map(record => {
        if (!record || typeof record !== "object" ||
            Object.keys(record).some(key => !["kind", "lineId", "text"].includes(key))) {
          fail("INVALID_LAYOUT", "Invalid line record");
        }
        scalarString(record.text);
        if (record.kind === "layout" && !("lineId" in record) && /^[ \t]*$/u.test(record.text)) {
          return { kind: "layout", text: record.text };
        }
        if (record.kind !== "line" || typeof record.lineId !== "string" ||
            record.lineId.length !== 36 || !uuid.test(record.lineId) || lineIds.includes(record.lineId) ||
            record.text.length === 0 || /[\r\n]/u.test(record.text)) {
          fail("INVALID_LAYOUT", "Invalid or duplicate line identity/text");
        }
        lineIds.push(record.lineId);
        return { kind: "line", lineId: record.lineId, text: textFor(record.text, profile) };
      });
      const verseIds = new Set();
      let previous = -1;
      for (const verse of verses) {
        if (!verse || Object.keys(verse).length !== 2 || typeof verse.id !== "string" ||
            verse.id.length !== 36 || !uuid.test(verse.id) || verseIds.has(verse.id) ||
            !Object.hasOwn(verse, "endsAt") || lineIds.indexOf(verse.endsAt) <= previous) {
          fail("INVALID_LAYOUT", "Invalid verse identity or ordered coverage");
        }
        verseIds.add(verse.id);
        previous = lineIds.indexOf(verse.endsAt);
      }
      if (verses.length && previous !== lineIds.length - 1) fail("INVALID_LAYOUT", "Incomplete verse coverage");
      return { ...envelope(profile), lines: converted, verses: structuredClone(verses) };
    },
  };
}
