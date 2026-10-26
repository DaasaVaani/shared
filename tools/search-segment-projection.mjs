export function captureSearchSpanProjection(segments, fail) {
  const captured = segments.map(({ start, end }) => ({ start, end }));
  return (segmentIndex, start, end) => {
    if (!Number.isSafeInteger(segmentIndex) || segmentIndex < 0 || segmentIndex >= captured.length) fail("line/segment reference");
    const segment = captured[segmentIndex];
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
        start < 0 || start >= end || end > segment.end - segment.start) fail("segment span");
    return [segment.start + start, segment.start + end];
  };
}

export function captureSearchSegmentProjection(lines, fail) {
  const captured = new Map(lines.map(line =>
    [line.lineId, captureSearchSpanProjection(line.segments, fail)]));
  return (lineId, segmentIndex, start, end) => {
    const project = captured.get(lineId);
    if (!project) fail("line/segment reference");
    return project(segmentIndex, start, end);
  };
}
