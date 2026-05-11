/**
 * 共享 JSDoc 类型，供 io / pipeline / main 引用。
 * 扩展：在 FileChunk 上增加字段时，同步更新 runPipeline 与 mergeFiles。
 */

/**
 * @typedef {Object} FileChunk
 * @property {string} name 原始文件名（含扩展名）
 * @property {string} ext 小写扩展名，无点；无扩展名时为 ""
 * @property {string} text 文件完整文本（UTF-8）
 */

/**
 * @typedef {'selection'|'filename'} MergeOrder
 */

/**
 * @typedef {'none'|'blank'|'filename'} MergeSeparator
 */

/**
 * @typedef {Object} MergeOptions
 * @property {MergeOrder} order
 * @property {MergeSeparator} separator
 */

/**
 * @typedef {Object} PipelineOptions
 * @property {MergeOptions} merge
 * @property {boolean} stripTrailingSlashSlash 是否对支持 // 的语言尝试去掉行尾 //
 * @property {boolean} [includeCommonLineCommentPrefixes] 是否合并通用前缀 &lt;!-- // /*（默认 true）
 * @property {string[]} [extraLineCommentPrefixes] 用户自定义整行前缀
 */

export {};
