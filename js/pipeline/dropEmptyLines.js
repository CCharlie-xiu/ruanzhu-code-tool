/**
 * 删除仅含空白字符的行。
 * @param {string[]} lines
 * @returns {string[]}
 */
export function dropEmptyLines(lines) {
  return lines.filter((line) => line.trim().length > 0);
}
