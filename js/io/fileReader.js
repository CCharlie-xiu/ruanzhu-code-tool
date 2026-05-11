/**
 * 浏览器内读取文件文本（UTF-8），不上传服务器。
 * 扩展：可增加第二个参数或重载以支持 GBK（需 Encoding API 或 wasm）。
 */

/**
 * @param {File[]} files
 * @returns {Promise<import('../pipeline/types.js').FileChunk[]>}
 */
export function readFilesAsText(files) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const name = file.name;
            const lastDot = name.lastIndexOf(".");
            const ext = lastDot >= 0 ? name.slice(lastDot + 1).toLowerCase() : "";
            resolve({
              name,
              ext,
              text: String(reader.result ?? ""),
            });
          };
          reader.onerror = () => reject(reader.error ?? new Error("读取失败"));
          reader.readAsText(file, "UTF-8");
        }),
    ),
  );
}
