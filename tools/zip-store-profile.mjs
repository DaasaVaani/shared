// Extracted from Library tools/zip-store.ts: the exact deterministic producer
// profile, not a general ZIP reader. Header comparison replaces full re-encoding.
const localSize = 30, directorySize = 46, endSize = 22;
const zip32Max = 0xffffffff;
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});

export function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

// The producer's header construction is shared by inspection and test fixtures.
export function zipStoreHeader(path, size, crc, offset) {
  const central = offset !== undefined;
  const result = new Uint8Array((central ? directorySize : localSize) + path.length);
  const view = new DataView(result.buffer);
  view.setUint32(0, central ? 0x02014b50 : 0x04034b50, true);
  if (central) view.setUint16(4, 20, true);
  const base = central ? 6 : 4;
  view.setUint16(base, 20, true);
  view.setUint16(base + 8, 0x21, true);
  view.setUint32(base + 10, crc, true);
  view.setUint32(base + 14, size, true);
  view.setUint32(base + 18, size, true);
  view.setUint16(base + 22, path.length, true);
  if (central) view.setUint32(42, offset, true);
  for (let index = 0; index < path.length; index++) result[(central ? directorySize : localSize) + index] = path.charCodeAt(index);
  return result;
}

export function inspectZipStore(bytes, members, fail) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = offset => view.getUint16(offset, true);
  const u32 = offset => view.getUint32(offset, true);
  const end = bytes.length - endSize;
  if (end < 0 || u32(end) !== 0x06054b50 || u32(end + 4) !== 0 || u16(end + 20) !== 0) fail("Invalid ZIP end record");
  const count = u16(end + 10), directory = u32(end + 16);
  if (count === 0xffff || count !== members.length || u16(end + 8) !== count ||
      directory === zip32Max || directory > end || u32(end + 12) !== end - directory) {
    fail("Invalid ZIP directory or member count");
  }
  const equalHeader = (offset, expected, boundary) => {
    if (offset + expected.length > boundary) fail("Truncated ZIP header");
    for (let index = 0; index < expected.length; index++) {
      if (bytes[offset + index] !== expected[index]) fail("Noncanonical or corrupt ZIP STORE header");
    }
  };
  const extents = [];
  let offset = 0, central = directory;
  for (const member of members) {
    if (offset + localSize > directory || u32(offset) !== 0x04034b50) fail("Invalid ZIP local header");
    const size = u32(offset + 18), nameSize = u16(offset + 26);
    const start = offset + localSize + nameSize;
    if (size === zip32Max || size !== member.encodedBytes || nameSize !== member.path.length ||
        u16(offset + 28) !== 0 || start + size > directory) fail("Invalid ZIP member extent");
    const payload = bytes.subarray(start, start + size);
    const crc = crc32(payload);
    equalHeader(offset, zipStoreHeader(member.path, size, crc), directory);
    const header = zipStoreHeader(member.path, size, crc, offset);
    equalHeader(central, header, end);
    extents.push({ start, end: start + size });
    offset = start + size;
    central += header.length;
  }
  if (offset !== directory || central !== end) fail("Noncanonical ZIP framing");
  return extents;
}
