import { createUnicodeReference } from "./unicode-reference.mjs";
import { decimalDigitValue, isKannadaDecimalDigit } from "./transliteration-decimals.mjs";

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
const orderedDecimalDigits = text => {
  const chars = Array.from(text);
  return chars.length === 10 && chars.every((char, index) => decimalDigitValue(char) === index);
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const latinIds = ["iso15919", "iast-kn", "baraha-kn", "itrans-kn", "harvard-kyoto-kn"];
const nativeRanges = {
  deva: [0x0900, 0x097f], telu: [0x0c00, 0x0c7f], taml: [0x0b80, 0x0bff],
  mlym: [0x0d00, 0x0d7f], gujr: [0x0a80, 0x0aff], beng: [0x0980, 0x09ff],
  asam: [0x0980, 0x09ff], guru: [0x0a00, 0x0a7f], orya: [0x0b00, 0x0b7f],
};

// Publisher-tooling reference only; not a consumer runtime or linguistic oracle.
export function createTransliterationReference(input, unicodeData) {
  const rules = structuredClone(input);
  if (rules.formatVersion !== 1 || rules.rulesId !== "kannada-multiscript-provisional-v1" ||
      rules.status !== "provisional-owner-review" || rules.sourceScript !== "kn" ||
      rules.unicodeProfile !== unicodeData.profile || !Number.isSafeInteger(rules.revision) ||
      rules.revision < 1) fail("INVALID_RULES", "Unsupported provisional rules identity");
  const unicode = createUnicodeReference(unicodeData);
  const alphabet = rules.alphabet;
  const ids = [...latinIds, ...Object.keys(nativeRanges)];
  if (!alphabet || !Array.isArray(rules.profiles) || rules.profiles.length !== ids.length ||
      new Set(rules.profiles.map(p => p.id)).size !== ids.length ||
      !ids.every(id => rules.profiles.some(p => p.id === id))) {
    fail("INVALID_RULES", "Invalid profile inventory");
  }
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
  if (!orderedDecimalDigits(alphabet.digits) || !Array.from(alphabet.digits).every(isKannadaDecimalDigit) ||
      !orderedDecimalDigits(alphabet.asciiDigits)) {
    fail("INVALID_RULES", "Source digits must have ordered Unicode16 Kannada/ASCII decimal values 0..9");
  }
  for (const profile of rules.profiles) {
    const native = Object.hasOwn(nativeRanges, profile.id);
    if (profile.kind !== (native ? "native" : "latin")) fail("INVALID_RULES", "Profile kind mismatch");
    if (!native && Object.hasOwn(profile, "digits")) fail("INVALID_RULES", "Latin profiles use only the declared ASCII digits");
    const targetScalar = char => {
      const cp = char.codePointAt(0), [low, high] = nativeRanges[profile.id];
      return cp >= low && cp <= high;
    };
    for (const [key, size] of [["vowels", 16], ["consonants", 34], ["marks", 4],
      ...(native ? [["vowelSigns", 16]] : [])]) {
      if (!Array.isArray(profile[key]) || profile[key].length !== size ||
          profile[key].some(token => token === null ? !native : !scalarString(token).length ||
            /[\s\u0000-\u001f\u007f-\u009f]/u.test(token) ||
            (native && !Array.from(token).every(targetScalar)))) {
        fail("INVALID_RULES", "Missing, empty, foreign-script or control-containing mapping");
      }
    }
    if (native) {
      if (profile.vowelSigns[0] !== null || !scalarString(profile.virama).length ||
          !Array.from(profile.virama).every(targetScalar) ||
          Array.from(scalarString(profile.digits)).length !== 10 ||
          new Set(profile.digits).size !== 10 || !Array.from(profile.digits).every(targetScalar) ||
          !orderedDecimalDigits(profile.digits)) {
        fail("INVALID_RULES", "Invalid native inherent sign, virama or digits");
      }
      if (profile.id === "taml") {
        if (!Array.isArray(profile.consonantSuffixes) || profile.consonantSuffixes.length !== 34 ||
            profile.consonantSuffixes.some(s => !["", "²", "³", "⁴"].includes(s))) {
          fail("INVALID_RULES", "Invalid Tamil consonant suffixes");
        }
      } else if (Object.hasOwn(profile, "consonantSuffixes")) fail("INVALID_RULES", "Unexpected consonant suffixes");
      const seen = new Set();
      if (!Array.isArray(profile.approximations)) fail("INVALID_RULES", "Missing approximation declarations");
      for (const entry of profile.approximations) {
        const key = `${entry.category}:${entry.index}`;
        if (!["vowels", "vowelSigns", "consonants", "marks"].includes(entry.category) ||
            !Number.isInteger(entry.index) || entry.index < 0 ||
            entry.index >= profile[entry.category].length || profile[entry.category][entry.index] === null ||
            typeof entry.reason !== "string" || !entry.reason.trim() || seen.has(key)) {
          fail("INVALID_RULES", "Invalid or duplicate approximation declaration");
        }
        seen.add(key);
      }
      if (profile.id === "taml" && profile.consonantSuffixes.some((s, i) =>
        s && !seen.has(`consonants:${i}`))) fail("INVALID_RULES", "Undeclared Tamil consonant approximation");
      for (const category of ["vowels", "vowelSigns", "consonants", "marks"]) {
        const targets = new Map();
        profile[category].forEach((value, index) => {
          if (value === null) return;
          const key = unicode.nfc(value + (category === "consonants" ? profile.consonantSuffixes?.[index] ?? "" : ""));
          targets.set(key, [...targets.get(key) ?? [], index]);
        });
        for (const indices of targets.values()) {
          if (indices.length > 1 && !indices.some(i => seen.has(`${category}:${i}`))) {
            fail("INVALID_RULES", "Undeclared native distinction merger");
          }
        }
      }
    }
  }
  const vowels = new Map(alphabet.vowels.map((char, i) => [char, i]));
  const signs = new Map(alphabet.vowelSigns.slice(1).map((char, i) => [char, i + 1]));
  const consonants = new Map(alphabet.consonants.map((char, i) => [char, i]));
  const marks = new Map(alphabet.marks.map((char, i) => [char, i]));
  const digits = new Map([...Array.from(alphabet.digits, (char, i) => [char, i]),
    ...Array.from(alphabet.asciiDigits, (char, i) => [char, i])]);
  const passthrough = new Set(alphabet.passthrough);
  function profileFor(id) {
    const profile = rules.profiles.find(p => p.id === id);
    if (!profile) fail("UNSUPPORTED_PROFILE", `Unsupported output profile: ${String(id)}`);
    return profile;
  }
  function textFor(text, profile) {
    const chars = Array.from(unicode.nfc(scalarString(text)));
    const out = [], approximations = [];
    function token(category, index, offset) {
      const value = profile[category][index];
      if (value === null) fail("UNSUPPORTED_MAPPING",
        `${profile.id} has no ${category} mapping for ${alphabet[category][index]}`, offset);
      const declaration = profile.approximations?.find(a => a.category === category && a.index === index);
      if (declaration) approximations.push({
        category, source: alphabet[category][index],
        output: value + (category === "consonants" ? profile.consonantSuffixes?.[index] ?? "" : ""),
        reason: declaration.reason, offset,
      });
      return value;
    }
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      if (consonants.has(char)) {
        const index = consonants.get(char);
        out.push(token("consonants", index, i));
        if (chars[i + 1] === alphabet.virama) {
          if (profile.kind === "native") out.push(profile.virama);
          i++;
        } else if (signs.has(chars[i + 1])) {
          const vowel = signs.get(chars[++i]);
          out.push(token(profile.kind === "native" ? "vowelSigns" : "vowels", vowel, i));
        } else if (profile.kind === "latin") out.push(profile.vowels[0]);
        if (profile.consonantSuffixes) out.push(profile.consonantSuffixes[index]);
      } else if (vowels.has(char)) out.push(token("vowels", vowels.get(char), i));
      else if (marks.has(char)) out.push(token("marks", marks.get(char), i));
      else if (digits.has(char)) out.push((profile.kind === "latin" ? alphabet.asciiDigits : profile.digits)[digits.get(char)]);
      else if (passthrough.has(char)) out.push(char);
      else fail(signs.has(char) || char === alphabet.virama ? "ORPHAN_SIGN" : "UNSUPPORTED_SCALAR",
        `Cannot convert U+${char.codePointAt(0).toString(16).toUpperCase()}`, i);
    }
    return { text: unicode.nfc(out.join("")), approximations };
  }
  const envelope = profile => ({
    rulesId: rules.rulesId, revision: rules.revision,
    status: rules.status, profileId: profile.id,
  });
  return {
    convertText(text, profileId) {
      const profile = profileFor(profileId);
      return { ...envelope(profile), ...textFor(text, profile) };
    },
    convertLayout(lines, verses, profileId) {
      const profile = profileFor(profileId);
      if (!Array.isArray(lines) || !Array.isArray(verses)) fail("INVALID_LAYOUT", "Expected line and verse arrays");
      const lineIds = [], approximations = [];
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
        let result;
        try {
          result = textFor(record.text, profile);
        } catch (error) {
          if (error instanceof TransliterationError) error.lineId = record.lineId;
          throw error;
        }
        approximations.push(...result.approximations.map(a => ({ ...a, lineId: record.lineId })));
        return { kind: "line", lineId: record.lineId, text: result.text };
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
      return { ...envelope(profile), lines: converted, verses: structuredClone(verses), approximations };
    },
  };
}
