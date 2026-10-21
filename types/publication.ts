export interface FixtureItem {
  formatVersion: 1;
  fixture: true;
  videoId: string;
  title: string;
  description?: string;
  tags: string[];
  lines: { id: string; text: string }[];
}

export interface ObjectRecord {
  role: "item" | "index" | "policy";
  path: string;
  encodedBytes: number;
  decodedBytes: number;
}

export interface Manifest {
  formatVersion: 1;
  fixture: true;
  requiredCapabilities: string[];
  objects: Record<string, ObjectRecord>;
  items: Record<string, string>;
  named: { index: string; policy: string };
  catalog: Pick<FixtureItem, "videoId" | "title" | "description" | "tags">[];
}

export interface Descriptor {
  formatVersion: 1;
  fixture: true;
  manifest: { path: string; sha256: string; encodedBytes: number; decodedBytes: number };
}

export interface SearchPolicy {
  formatVersion: 1;
  maxQueryCodePoints: number;
  maxTerms: number;
  pageSize: number;
  debounceMs: number;
  maxExcerptLines: number;
  maxExcerptCodePoints: number;
  editBands: { maxLength: number; edits: number }[];
  weights: Record<string, number>;
}

export interface SearchToken {
  value: string;
  itemId: string;
  field: string;
  lineId?: string;
}

export interface SearchIndex {
  formatVersion: 1;
  policyHash: string;
  tokens: SearchToken[];
  postings: Record<string, [number, number][]>;
}
