/**
 * 合并「通用前缀 + 扩展名专用 + 用户自定义」整行注释前缀，去重并按长度降序（先匹配更长串）。
 */

import { COMMON_FULL_LINE_PREFIXES } from "./commonLinePrefixes.js";
import { getExtSpecificPrefixes } from "./commentPrefixesByExt.js";

/**
 * @param {string} ext 小写、无点
 * @param {{ includeCommon?: boolean, extraPrefixes?: string[] }} opts
 * @returns {string[]}
 */
export function mergeLinePrefixes(ext, opts = {}) {
  const includeCommon = opts.includeCommon !== false;
  const extra = opts.extraPrefixes ?? [];

  /** @type {string[]} */
  const parts = [];
  if (includeCommon) {
    parts.push(...COMMON_FULL_LINE_PREFIXES);
  }
  parts.push(...getExtSpecificPrefixes(ext));
  for (const raw of extra) {
    const s = String(raw).trim();
    if (s) parts.push(s);
  }

  const uniq = [...new Set(parts)];
  uniq.sort((a, b) => b.length - a.length);
  return uniq;
}
