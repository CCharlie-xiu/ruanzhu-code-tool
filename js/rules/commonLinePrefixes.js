/**
 * 与扩展名无关的「整行单行注释」常见前缀（仅匹配以该前缀开头的整行）。
 * 跨行块注释（C 风格星号块、HTML 注释）由 stripBlockComments 处理，不依赖本表。
 * 扩展：仅改本数组即可影响所有勾选「通用前缀」的文件。
 */

/** @type {readonly string[]} */
export const COMMON_FULL_LINE_PREFIXES = Object.freeze(["<!--", "//", "/*"]);
