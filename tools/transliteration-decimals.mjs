import { loadUnicodeSources } from "./generate-unicode.mjs";
import { buildGeneralCategoryRanges } from "./generate-search-characters.mjs";

export function buildTransliterationDecimalData(text) {
  buildGeneralCategoryRanges(text);
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const row = line.split(";");
    if (row[2] !== "Nd" && row[6] === "") continue;
    const codePoint = parseInt(row[0], 16);
    if (row[2] !== "Nd" || !/^[0-9]$/.test(row[6]) ||
        row[7] !== row[6] || row[8] !== row[6] ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
        /^<.*(?:First|Last)>$/.test(row[1])) {
      throw new Error("Invalid UnicodeData decimal digit source");
    }
    rows.push({ codePoint, value: Number(row[6]), kannada: row[1].startsWith("KANNADA DIGIT ") });
  }
  if (!rows.length) throw new Error("Missing UnicodeData decimal digit source");
  return rows;
}

const rows = await (async () => {
  const { settings, sources } = await loadUnicodeSources();
  if (settings.unicodeVersion !== "16.0.0") throw new Error("Incompatible transliteration decimal Unicode version");
  return buildTransliterationDecimalData(sources["UnicodeData.txt"]);
})();
const digits = new Map(rows.map(row => [String.fromCodePoint(row.codePoint), row]));

export const decimalDigitValue = char => digits.get(char)?.value;
export const isKannadaDecimalDigit = char => digits.get(char)?.kannada === true;
