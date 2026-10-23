// Node-only conformance tooling; consumers supply their own bounded off-UI adapters.
import Ajv2020 from "ajv/dist/2020.js";
import { gzipSync, inflateRawSync } from "node:zlib";
import { fullBackupSchema } from "./generate-personal-contracts.mjs";

export class BackupFailure extends Error {
  constructor(code) {
    super(`Personal backup rejected: ${code}`);
    this.code = code;
  }
}
const fail = code => { throw new BackupFailure(code); };
const referenceKey = value => `${value.kind}:${value.lyricId ?? value.videoId}`;
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});
const crc32 = bytes => {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
};

// JSON.parse has already checked syntax. This iterative scan rejects ambiguous keys.
function uniqueJsonKeys(text) {
  const stack = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      const start = i++;
      for (; i < text.length; i++) {
        if (text[i] === "\\") i++;
        else if (text[i] === '"') break;
      }
      const frame = stack.at(-1);
      if (frame?.key) {
        const key = JSON.parse(text.slice(start, i + 1));
        if (frame.keys.has(key)) fail("json");
        frame.keys.add(key);
        frame.key = false;
      }
    } else if (char === "{") stack.push({ key: true, keys: new Set() });
    else if (char === "[") stack.push(null);
    else if (char === "}" || char === "]") stack.pop();
    else if (char === "," && stack.at(-1)) stack.at(-1).key = true;
  }
}

export function createBackupReference(limits, profiles, nameKey) {
  if (typeof nameKey !== "function") throw new TypeError("Pinned Unicode name-key function required");
  const check = new Ajv2020({ strict: true }).compile(fullBackupSchema(limits, profiles));
  function validate(value, platform) {
    if (platform !== "web" && platform !== "android") fail("platform");
    if (value?.format !== "daasavaani-personal-backup" || value?.formatVersion !== 1) fail("unsupported");
    if (value.platform !== platform) fail("platform");
    if (!check(value)) fail("invalid");
    const pending = [value];
    while (pending.length) {
      const current = pending.pop();
      if (typeof current === "string" && /[\ud800-\udfff]/u.test(current)) fail("invalid");
      if (current === undefined || (typeof current === "number" && !Number.isFinite(current))) fail("invalid");
      if (current && typeof current === "object") {
        const array = Array.isArray(current);
        if ((!array && Object.getPrototypeOf(current) !== Object.prototype) ||
            Reflect.ownKeys(current).length !== Object.keys(current).length + (array ? 1 : 0) ||
            (array && Object.keys(current).length !== current.length)) fail("invalid");
        for (const key of Object.keys(current)) {
          const descriptor = Object.getOwnPropertyDescriptor(current, key);
          if (!Object.hasOwn(descriptor, "value")) fail("invalid");
          pending.push(descriptor.value);
        }
      }
    }
    const date = new Date(value.exportedAt);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== value.exportedAt) fail("invalid");
    const data = value.data;
    if (platform === "web" && data.preferences === null && data.favorites.length) fail("invalid");
    const unique = values => {
      const keys = values.map(referenceKey);
      if (new Set(keys).size !== keys.length) fail("invalid");
    };
    unique(data.favorites);
    unique(data[platform === "web" ? "history" : "recentHistory"].entries);
    unique(data.learning.entries);
    const listIds = new Set(), entryIds = new Set();
    let total = 0;
    for (const list of data.lists) {
      if (listIds.has(list.id)) fail("invalid");
      listIds.add(list.id);
      total += list.entries.length;
      if (total > limits.maxTotalEntries) fail("size");
      for (const entry of list.entries) {
        if (entryIds.has(entry.id)) fail("invalid");
        entryIds.add(entry.id);
      }
    }
    const bytes = Buffer.from(JSON.stringify(canonical(value)), "utf8");
    if (bytes.length > limits.maxBackupDecodedBytes ||
        Buffer.byteLength(JSON.stringify(canonical(data)), "utf8") > limits.maxPersonalStoredBytes) fail("size");
    return bytes;
  }
  function encode(value, platform) {
    const bytes = validate(value, platform);
    const encoded = gzipSync(bytes);
    if (encoded.length > limits.maxBackupEncodedBytes) fail("size");
    return encoded;
  }
  function decode(input, platform) {
    if (!(input instanceof Uint8Array)) fail("gzip");
    if (input.byteLength > limits.maxBackupEncodedBytes) fail("size");
    const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
    if (bytes.length < 18 || bytes[0] !== 31 || bytes[1] !== 139 || bytes[2] !== 8 || (bytes[3] & 0xe0)) fail("gzip");
    const flags = bytes[3];
    let offset = 10;
    const reserve = count => { if (offset + count > bytes.length - 8) fail("gzip"); };
    if (flags & 4) {
      reserve(2);
      const length = bytes.readUInt16LE(offset);
      offset += 2;
      reserve(length);
      offset += length;
    }
    for (const flag of [8, 16]) {
      if (flags & flag) {
        do { reserve(1); } while (bytes[offset++] !== 0);
      }
    }
    if (flags & 2) {
      reserve(2);
      if ((crc32(bytes.subarray(0, offset)) & 0xffff) !== bytes.readUInt16LE(offset)) fail("gzip");
      offset += 2;
    }
    let inflated;
    try {
      inflated = inflateRawSync(bytes.subarray(offset), { info: true, maxOutputLength: limits.maxBackupDecodedBytes });
    } catch (error) {
      fail(error.code === "ERR_BUFFER_TOO_LARGE" ? "size" : "gzip");
    }
    const decoded = inflated.buffer;
    const trailer = offset + inflated.engine.bytesWritten;
    if (trailer + 8 !== bytes.length || bytes.readUInt32LE(trailer) !== crc32(decoded) ||
        bytes.readUInt32LE(trailer + 4) !== (decoded.length >>> 0)) fail("gzip");
    let text, value;
    try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(decoded); }
    catch { fail("utf8"); }
    if (text.startsWith("\ufeff")) text = text.slice(1);
    try { value = JSON.parse(text); } catch { fail("json"); }
    uniqueJsonKeys(text);
    validate(value, platform);
    return value;
  }
  function preview(value, platform) {
    const bytes = validate(value, platform);
    const groups = new Map();
    for (const list of value.data.lists) {
      const key = nameKey(list.name);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(list.id);
    }
    return {
      platform, exportedAt: value.exportedAt, decodedBytes: bytes.length,
      favorites: value.data.favorites.length, lists: value.data.lists.length,
      occurrences: value.data.lists.reduce((sum, list) => sum + list.entries.length, 0),
      recents: value.data[platform === "web" ? "history" : "recentHistory"].entries.length,
      learning: value.data.learning.entries.length,
      hasRecitationPosition: value.data.recitation.position !== null,
      duplicateNameGroups: [...groups.values()].filter(ids => ids.length > 1),
    };
  }
  return { validate, encode, decode, preview };
}
