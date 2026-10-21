// Contract reference only: no host normalization, locale or Unicode-property APIs.
export function createUnicodeReference(data) {
  if (data.formatVersion !== 1 || data.profile !== "unicode16-default-full-nfc-v1" ||
      data.unicodeVersion !== "16.0.0") throw new Error("Unsupported Unicode profile");
  const classes = new Map(data.combiningClasses);
  const decompositions = new Map(data.canonicalDecompositions);
  const folding = new Map(data.caseFolding);
  const compositions = new Map();
  for (const [a, b, cp] of data.compositions) {
    if (!compositions.has(a)) compositions.set(a, new Map());
    compositions.get(a).set(b, cp);
  }
  const ccc = cp => classes.get(cp) ?? 0;
  const scalars = text => {
    if (typeof text !== "string") throw new TypeError("Expected a Unicode scalar string");
    return Array.from(text, char => {
      const cp = char.codePointAt(0);
      if (cp >= 0xd800 && cp <= 0xdfff) throw new TypeError("Unpaired surrogate");
      return cp;
    });
  };
  const string = cps => cps.map(cp => String.fromCodePoint(cp)).join("");

  function decompose(cp, out) {
    const syllable = cp - 0xac00;
    if (syllable >= 0 && syllable < 11172) {
      out.push(0x1100 + Math.floor(syllable / 588), 0x1161 + Math.floor((syllable % 588) / 28));
      if (syllable % 28) out.push(0x11a7 + syllable % 28);
    } else if (decompositions.has(cp)) {
      for (const child of decompositions.get(cp)) decompose(child, out);
    } else out.push(cp);
  }
  function orderedDecomposition(text) {
    const out = [];
    for (const cp of scalars(text)) decompose(cp, out);
    // Stable insertion preserves equal-class blocking and leading nonstarters.
    for (let i = 1; i < out.length; i++) {
      const cls = ccc(out[i]);
      if (cls === 0) continue;
      let j = i;
      while (j > 0 && ccc(out[j - 1]) > cls) {
        [out[j - 1], out[j]] = [out[j], out[j - 1]];
        j--;
      }
    }
    return out;
  }
  function composite(a, b) {
    const l = a - 0x1100, v = b - 0x1161;
    if (l >= 0 && l < 19 && v >= 0 && v < 21) return 0xac00 + (l * 21 + v) * 28;
    const s = a - 0xac00, t = b - 0x11a7;
    if (s >= 0 && s < 11172 && s % 28 === 0 && t > 0 && t < 28) return a + t;
    return compositions.get(a)?.get(b);
  }
  function nfc(text) {
    const input = orderedDecomposition(text), out = [];
    let starterIndex = -1, lastClass = 0;
    for (const cp of input) {
      const cls = ccc(cp);
      const combined = starterIndex < 0 ? undefined : composite(out[starterIndex], cp);
      if (combined !== undefined && (lastClass === 0 || lastClass < cls)) {
        out[starterIndex] = combined;
      } else {
        if (cls === 0) starterIndex = out.length;
        out.push(cp);
        lastClass = cls;
      }
    }
    return string(out);
  }
  const fullCaseFold = text => string(scalars(text).flatMap(cp => folding.get(cp) ?? [cp]));
  return {
    nfc,
    nfd: text => string(orderedDecomposition(text)),
    fullCaseFold,
    nameKey: text => nfc(fullCaseFold(nfc(text))),
  };
}
