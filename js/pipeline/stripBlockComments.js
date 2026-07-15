/**
 * 去掉块注释（可跨多行）：
 * - C 风格星号块（含 JSDoc、CSS 等）
 * - HTML/XML 弯括号注释
 *
 * 启发式：简单跳过双/单引号字符串；不处理模板字符串与正则字面量，复杂代码可能误判。
 */

/**
 * @typedef {'code'|'c_block'|'html_block'} BlockScanState
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
      const end = line.indexOf("*/", i);
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

    const c = line[i];
    const rest = line.slice(i);

    if (c === '"') {
      out += c;
      i++;
      while (i < line.length) {
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
        if (ch === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    if (c === "'") {
      out += c;
      i++;
      while (i < line.length) {
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
        if (ch === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    if (opts.stripHtml && rest.startsWith("<!--")) {
      s = "html_block";
      i += 4;
      continue;
    }

    if (opts.stripCStyle && rest.startsWith("/*")) {
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
    // 块注释掏空后的纯空白行丢弃；真正的空行留给后续 dropEmptyLines
    if (scanned.text.trim().length > 0) {
      out.push(scanned.text.trimEnd());
    } else if (state === "code" && line.trim().length === 0) {
      out.push(line);
    }
  }

  return out;
}
