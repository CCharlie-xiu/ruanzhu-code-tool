/**
 * 尝试去掉行尾 // 注释（启发式）：仅在双引号/单引号外识别 //，并处理简单转义。
 * 不处理模板字符串与正则字面量，复杂代码可能误判——由 UI 提示。
 */

/**
 * @param {string} line
 * @returns {string}
 */
export function stripTrailingSlashSlashLine(line) {
  let state = /** @type {'code'|'dstr'|'sstr'} */ ("code");
  for (let i = 0; i < line.length - 1; i++) {
    const c = line[i];
    const n = line[i + 1];

    if (state === "code") {
      if (c === '"') {
        state = "dstr";
        continue;
      }
      if (c === "'") {
        state = "sstr";
        continue;
      }
      if (c === "/" && n === "/") {
        return line.slice(0, i).trimEnd();
      }
      continue;
    }

    if (state === "dstr") {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === '"') state = "code";
      continue;
    }

    if (state === "sstr") {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === "'") state = "code";
    }
  }
  return line;
}

/**
 * @param {string[]} lines
 * @returns {string[]}
 */
export function stripTrailingSlashSlashLines(lines) {
  return lines.map((ln) => stripTrailingSlashSlashLine(ln));
}
