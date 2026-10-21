export interface LyricSourceHeader {
  sourceFormat: 2;
  lyricId: string;
  public: { title: string; tags: string[] };
  provenance: { kind: "owner-supplied"; sourceFile: string; sha256: string; encoding: "utf-8" | "utf-16le" | "utf-16be" };
  review: { holdReasons: string[] };
}
export interface LyricObjectReference {
  sha256: string;
  path: string;
  encodedBytes: number;
  decodedBytes: number;
}
export interface LyricItem {
  format: "daasavaani-lyric";
  formatVersion: 1;
  lyricId: string;
  canonicalScript: "kn";
  title: string;
  tags: string[];
  lines: ({ kind: "line"; lineId: string; text: string } | { kind: "layout"; text: string })[];
}
export interface LyricDescriptor {
  format: "daasavaani-lyrics";
  formatVersion: 1;
  manifest: LyricObjectReference;
}
export interface LyricManifest {
  format: "daasavaani-lyric-catalog";
  formatVersion: 1;
  stage: "prelaunch";
  requiredCapabilities: ["lyric-preview-v1"];
  catalog: (Pick<LyricItem, "lyricId" | "title" | "tags"> & { item: LyricObjectReference })[];
}
