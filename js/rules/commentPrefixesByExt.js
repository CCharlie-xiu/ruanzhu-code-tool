/**
 * 扩展名 → 整行单行注释前缀（从行首 trim 后匹配）。
 * 扩展语言：在此表增加 ext 与对应前缀数组即可。
 * 未知扩展名：此处返回 []，仍会与「通用前缀」（<!-- // /*）及页面「额外前缀」合并，见 mergeLinePrefixes.js。
 */

/** @type {Record<string, string[]>} */
const PREFIXES = {
  // C 家族 //
  js: ["//"],
  mjs: ["//"],
  cjs: ["//"],
  ts: ["//"],
  tsx: ["//"],
  jsx: ["//"],
  java: ["//"],
  kt: ["//"],
  kts: ["//"],
  cs: ["//"],
  go: ["//"],
  swift: ["//"],
  rs: ["//"],
  scala: ["//"],
  groovy: ["//"],
  dart: ["//"],
  c: ["//"],
  h: ["//"],
  cc: ["//"],
  cxx: ["//"],
  cpp: ["//"],
  hpp: ["//"],
  hh: ["//"],
  hxx: ["//"],
  inl: ["//"],
  php: ["//", "#"],
  // # 家族
  py: ["#"],
  pyw: ["#"],
  pyi: ["#"],
  sh: ["#"],
  bash: ["#"],
  zsh: ["#"],
  yaml: ["#"],
  yml: ["#"],
  toml: ["#"],
  rb: ["#"],
  r: ["#"],
  pl: ["#"],
  pm: ["#"],
  dockerfile: ["#"],
  // SQL / Lua --
  sql: ["--"],
  lua: ["--"],
};

/**
 * 仅扩展名映射表中的前缀（不含通用 <!-- // /* 与用户自定义）。
 * @param {string} ext 小写、无点
 * @returns {string[]}
 */
export function getExtSpecificPrefixes(ext) {
  if (!ext) return [];
  return PREFIXES[ext] ? [...PREFIXES[ext]] : [];
}

/** @deprecated 使用 getExtSpecificPrefixes；保留别名以免外部脚本引用断裂 */
export const getCommentPrefixesForExt = getExtSpecificPrefixes;

/**
 * 是否存在该扩展名的专用前缀映射。
 * @param {string} ext
 * @returns {boolean}
 */
export function hasExtSpecificCommentRule(ext) {
  return getExtSpecificPrefixes(ext).length > 0;
}

/** @deprecated 使用 hasExtSpecificCommentRule */
export const hasKnownCommentRule = hasExtSpecificCommentRule;
