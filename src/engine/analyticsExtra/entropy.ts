/**
 * Base-2 Shannon entropy of exact string categories: -sum(p * log2(p)).
 * Empty series have zero entropy; a single category also has zero entropy.
 */
export function categoricalEntropy(values: readonly string[]): number {
  if (values.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / values.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}
