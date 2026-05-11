/**
 * 与扩展名无关的「整行注释」常见前缀，适用于 HTML/XML、C 家族等混排场景。
 * 扩展：仅改本数组即可影响所有勾选「通用前缀」的文件。
 */

/** @type {readonly string[]} */
export const COMMON_FULL_LINE_PREFIXES = Object.freeze(["<!--", "//", "/*"]);
