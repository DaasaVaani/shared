export function captureSearchSegmentProjection(lines, fail) {
  const captured = new Map(lines.map(line =>
    [line.lineId, line.segments.map(({ start, end }) => ({ start, end }))]));
  return (lineId, segmentIndex, start, end) => {
    const segments = captured.get(lineId);
    if (!segments || !Number.isSafeInteger(segmentIndex) || segmentIndex < 0 || segmentIndex >= segments.length) fail("line/segment reference");
    const segment = segments[segmentIndex];
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
        start < 0 || start >= end || end > segment.end - segment.start) fail("segment span");
    return [segment.start + start, segment.start + end];
  };
}
