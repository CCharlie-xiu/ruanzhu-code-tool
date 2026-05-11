/**
 * 将已处理的行数组按顺序合并为单一文本。
 * 扩展：新增分隔策略时在此增加分支，并在 types.MergeSeparator 中声明。
 */

/**
 * @typedef {import('./types.js').FileChunk} FileChunk
 */

/**
 * @typedef {Object} ChunkWithLines
 * @property {string} name
 * @property {string} ext
 * @property {string[]} lines
 */

/**
 * @param {ChunkWithLines[]} chunks
 * @param {import('./types.js').MergeOptions} opts
 * @returns {string}
 */
export function mergeFiles(chunks, opts) {
  /** @type {ChunkWithLines[]} */
  let ordered = [...chunks];
  if (opts.order === "filename") {
    ordered = [...chunks].sort((a, b) =>
      a.name.localeCompare(b.name, "zh-Hans-CN", { sensitivity: "base" }),
    );
  }

  /** @type {string[]} */
  const out = [];
  for (let i = 0; i < ordered.length; i++) {
    const c = ordered[i];
    if (opts.separator === "filename") {
      out.push(`// ${c.name}`);
    } else if (opts.separator === "blank") {
      if (out.length > 0) out.push("");
    }
    out.push(...c.lines);
  }
  return out.join("\n");
}
