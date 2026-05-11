/**
 * 对外单一入口：单文件处理（空行、整行注释、可选行尾 //）再合并。
 * 扩展：新增步骤时 import 并在 processChunk 内按需调用。
 */

import { dropEmptyLines } from "./dropEmptyLines.js";
import { mergeFiles } from "./mergeFiles.js";
import { stripFullLineComments } from "./stripFullLineComments.js";
import { stripTrailingSlashSlashLines } from "./stripTrailingLineComment.js";
import { mergeLinePrefixes } from "../rules/mergeLinePrefixes.js";

/**
 * @param {import('./types.js').FileChunk[]} chunks
 * @param {import('./types.js').PipelineOptions} options
 * @returns {string}
 */
export function runPipeline(chunks, options) {
  const withLines = chunks.map((chunk) => {
    let lines = chunk.text.split(/\r?\n/);
    lines = dropEmptyLines(lines);
    const prefixes = mergeLinePrefixes(chunk.ext, {
      includeCommon: options.includeCommonLineCommentPrefixes !== false,
      extraPrefixes: options.extraLineCommentPrefixes ?? [],
    });
    lines = stripFullLineComments(lines, prefixes);
    const allowTrailing =
      options.stripTrailingSlashSlash && prefixes.includes("//");
    if (allowTrailing) {
      lines = stripTrailingSlashSlashLines(lines);
    }
    return { name: chunk.name, ext: chunk.ext, lines };
  });

  return mergeFiles(withLines, options.merge);
}
