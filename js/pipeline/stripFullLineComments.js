/**
 * 删除「整行」单行注释：trim 后以任一 prefix 开头则整行丢弃。
 * @param {string[]} lines
 * @param {string[]} prefixes
 * @returns {string[]}
 */
export function stripFullLineComments(lines, prefixes) {
  if (!prefixes.length) return lines;
  const ordered = [...prefixes].sort((a, b) => b.length - a.length);
  return lines.filter((line) => {
    const t = line.trimStart();
    return !ordered.some((p) => t.startsWith(p));
  });
}
