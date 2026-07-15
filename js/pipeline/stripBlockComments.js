/**
 * 去掉 C 风格 / HTML 块注释，并清掉残留的 JSDoc 星号续行。
 *
 * 说明：
 * - 正常块注释由状态机删除
 * - 若开头行已同行闭合，后续星号续行与结尾闭合会成孤儿，需二次清理
 * - 启发式：跳过双/单引号与反引号模板字符串，减少误伤
 */

/**
 * @typedef {'code'|'c_block'|'html_block'|'dstr'|'sstr'|'tmpl'} BlockScanState
 */

/**
 * @param {string} line
 * @param {BlockScanState} state
 * @param {{ stripCStyle: boolean, stripHtml: boolean }} opts
 * @returns {{ text: string, state: BlockScanState }}
 */
function scanLine(line, state, opts) {
  let i = 0;
  let out = "";
  /** @type {BlockScanState} */
  let s = state;

  while (i < line.length) {
    if (s === "c_block") {
      const end = line.indexOf("*" + "/", i);
      if (end === -1) return { text: out, state: s };
      i = end + 2;
      s = "code";
      continue;
    }

    if (s === "html_block") {
      const end = line.indexOf("-->", i);
      if (end === -1) return { text: out, state: s };
      i = end + 3;
      s = "code";
      continue;
    }

    if (s === "dstr") {
      const ch = line[i];
      out += ch;
      if (ch === "\\") {
        if (i + 1 < line.length) {
          out += line[i + 1];
          i += 2;
          continue;
        }
        i++;
        break;
      }
      if (ch === '"') s = "code";
      i++;
      continue;
    }

    if (s === "sstr") {
      const ch = line[i];
      out += ch;
      if (ch === "\\") {
        if (i + 1 < line.length) {
          out += line[i + 1];
          i += 2;
          continue;
        }
        i++;
        break;
      }
      if (ch === "'") s = "code";
      i++;
      continue;
    }

    if (s === "tmpl") {
      const ch = line[i];
      out += ch;
      if (ch === "\\") {
        if (i + 1 < line.length) {
          out += line[i + 1];
          i += 2;
          continue;
        }
        i++;
        break;
      }
      if (ch === "`") {
        s = "code";
        i++;
        continue;
      }
      if (ch === "$" && line[i + 1] === "{") {
        out += "{";
        i += 2;
        let depth = 1;
        while (i < line.length && depth > 0) {
          const inner = line[i];
          if (inner === "\\") {
            out += inner;
            if (i + 1 < line.length) {
              out += line[i + 1];
              i += 2;
              continue;
            }
            i++;
            break;
          }
          if (inner === "{") depth++;
          else if (inner === "}") {
            depth--;
            out += inner;
            i++;
            continue;
          }
          if (opts.stripCStyle && inner === "/" && line[i + 1] === "*") {
            i += 2;
            const end = line.indexOf("*" + "/", i);
            if (end === -1) {
              s = "c_block";
              return { text: out, state: s };
            }
            i = end + 2;
            continue;
          }
          out += inner;
          i++;
        }
        continue;
      }
      i++;
      continue;
    }

    const c = line[i];
    const rest = line.slice(i);

    if (c === '"') {
      out += c;
      i++;
      s = "dstr";
      continue;
    }
    if (c === "'") {
      out += c;
      i++;
      s = "sstr";
      continue;
    }
    if (c === "`") {
      out += c;
      i++;
      s = "tmpl";
      continue;
    }

    if (opts.stripHtml && rest.startsWith("<!--")) {
      s = "html_block";
      i += 4;
      continue;
    }

    if (opts.stripCStyle && rest.startsWith("/" + "*")) {
      s = "c_block";
      i += 2;
      continue;
    }

    out += c;
    i++;
  }

  return { text: out, state: s };
}

/**
 * 是否像 JSDoc / 块注释星号续行：行首空白后是 *，且后接空白、/ 或行尾。
 * 不匹配 *ptr、*.class 等代码。
 * @param {string} line
 */
export function isStarBlockRemnantLine(line) {
  return /^\s*\*(?:\s|\/|$)/.test(line);
}

/**
 * 粗判是否像真实代码行（用来挡住从结尾往回扫时误删逻辑代码）。
 * @param {string} line
 */
function looksLikeCodeLine(line) {
  return (
    /^\s*(?:[\{\}]|function\b|const\b|let\b|var\b|import\b|export\b|class\b|return\b|if\b|for\b|while\b|switch\b|case\b|default\b|break\b|continue\b|try\b|catch\b|throw\b|async\b|await\b|type\b|interface\b|enum\b|namespace\b|from\b|extends\b|def\b|public\b|private\b|protected\b|static\b)/.test(
      line,
    ) ||
    /^\s*[a-zA-Z_$][\w$]*\s*[=\(]/.test(line) ||
    /^\s*[a-zA-Z_$][\w$]*\.[a-zA-Z_$]/.test(line)
  );
}

/**
 * 清掉「开头行已闭合/已删」后残留的星号续行与闭合行。
 * - 从结尾闭合行往回扫，去掉星号续行及夹在中间的换行残句
 * - 连续至少 2 行星号续行即使没有闭合也去掉
 * - 单行且无闭合时保留（如 CSS 的 "* {"）
 * @param {string[]} lines
 * @returns {string[]}
 */
export function stripOrphanStarBlockLines(lines) {
  const drop = new Set();

  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\*\//.test(lines[i])) continue;
    drop.add(i);
    for (let k = i - 1; k >= 0; k--) {
      if (drop.has(k)) continue;
      const t = lines[k].trim();
      if (!t) break;
      if (isStarBlockRemnantLine(lines[k]) || !looksLikeCodeLine(lines[k])) {
        drop.add(k);
        continue;
      }
      break;
    }
  }

  let i = 0;
  while (i < lines.length) {
    if (drop.has(i) || !isStarBlockRemnantLine(lines[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j < lines.length && !drop.has(j) && isStarBlockRemnantLine(lines[j])) {
      j++;
    }
    if (j - i >= 2) {
      for (let k = i; k < j; k++) drop.add(k);
    }
    i = Math.max(j, i + 1);
  }

  return lines.filter((_, idx) => !drop.has(idx));
}

/**
 * @param {string[]} lines
 * @param {{ stripCStyle?: boolean, stripHtml?: boolean }} [options]
 * @returns {string[]}
 */
export function stripBlockComments(lines, options = {}) {
  const opts = {
    stripCStyle: options.stripCStyle !== false,
    stripHtml: options.stripHtml !== false,
  };
  if (!opts.stripCStyle && !opts.stripHtml) return lines;

  /** @type {BlockScanState} */
  let state = "code";
  /** @type {string[]} */
  const out = [];

  for (const line of lines) {
    const scanned = scanLine(line, state, opts);
    state = scanned.state;
    if (scanned.text.trim().length > 0) {
      out.push(scanned.text.trimEnd());
    } else if (state === "code" && line.trim().length === 0) {
      out.push(line);
    }
  }

  return opts.stripCStyle ? stripOrphanStarBlockLines(out) : out;
}
