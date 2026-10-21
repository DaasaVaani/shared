export interface LyricSourceHeader {
  sourceFormat: 2;
  lyricId: string;
  public: {
    title: string;
    tags: string[];
    classification?: { composerIds: string[]; ankitaIds: string[]; deityIds: string[]; formIds: string[]; categoryIds: string[]; contextIds: string[] };
    contextDescription?: string;
    verses?: { id: string; endsAt: string }[];
    youtube?: { videoId: string; url: string }[];
    images?: { asset: string; alt: string }[];
  };
  provenance: {
    kind: "owner-supplied"; sourceFile: string; sha256: string; encoding: "utf-8" | "utf-16le" | "utf-16be";
    sourceUrls?: string[];
    description?: string;
    rights?: { license: string; attribution: string; evidenceUrls: string[] };
    videos?: { videoId: string; originalTitle: string; channelId: string; channelName: string; uploadedOn: string; description: string }[];
    images?: { asset: string; sourceUrl: string; creator: string; license: string; attribution: string }[];
  };
  review: {
    holdReasons: string[];
    sourceLatin?: {
      readable: boolean | null;
      searchable: boolean | null;
      alignment: { lineId: string; ranges: [number, number][] }[];
    };
  };
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
