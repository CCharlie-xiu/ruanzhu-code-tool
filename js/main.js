/**
 * 应用入口：仅负责 DOM 与调用 io / pipeline。
 * 扩展 UI：在此增加控件并传入 runPipeline 的 options 即可。
 */

import { readFilesAsText } from "./io/fileReader.js";
import { runPipeline } from "./pipeline/runPipeline.js";
import { hasExtSpecificCommentRule } from "./rules/commentPrefixesByExt.js";
import { mergeLinePrefixes } from "./rules/mergeLinePrefixes.js";

/** @type {File[]} */
let selectedFiles = [];

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const btnClear = document.getElementById("btn-clear");
const btnRun = document.getElementById("btn-run");
const btnCopy = document.getElementById("btn-copy");
const output = document.getElementById("output");
const fileList = document.getElementById("file-list");
const warnUnknown = document.getElementById("warn-unknown");
const copyStatus = document.getElementById("copy-status");
const optTrailing = document.getElementById("opt-trailing");
const optBlock = document.getElementById("opt-block");
const optCommonPrefix = document.getElementById("opt-common-prefix");
const extraPrefixesInput = document.getElementById("extra-prefixes");

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** @param {string} name */
function fileExtFromName(name) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** @param {string} raw */
function parseExtraPrefixes(raw) {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\r\n,，]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function getLinePrefixUiOptions() {
  return {
    includeCommon: optCommonPrefix ? optCommonPrefix.checked : true,
    extraPrefixes: parseExtraPrefixes(extraPrefixesInput?.value ?? ""),
  };
}

function renderFileList() {
  fileList.innerHTML = "";
  for (const f of selectedFiles) {
    const row = document.createElement("div");
    row.className = "file-item";
    const left = document.createElement("span");
    left.textContent = f.name;
    const meta = document.createElement("span");
    meta.className = "meta";
    const ext = fileExtFromName(f.name);
    const specific = hasExtSpecificCommentRule(ext);
    meta.textContent = specific ? formatBytes(f.size) : `${formatBytes(f.size)} · 无专用单行前缀`;
    row.appendChild(left);
    row.appendChild(meta);
    fileList.appendChild(row);
  }

  const prefixOpts = getLinePrefixUiOptions();
  const blockOn = optBlock ? optBlock.checked : true;
  const noPrefixes = selectedFiles.filter(
    (f) => mergeLinePrefixes(fileExtFromName(f.name), prefixOpts).length === 0,
  );
  if (noPrefixes.length && !blockOn) {
    warnUnknown.hidden = false;
    warnUnknown.textContent = `以下文件当前没有任何整行注释前缀，且未开启块注释清理（请开启①/③、填写额外前缀，或为该扩展名在 js/rules/commentPrefixesByExt.js 增加映射）：${noPrefixes.map((f) => f.name).join("、")}`;
  } else if (noPrefixes.length && blockOn) {
    warnUnknown.hidden = false;
    warnUnknown.textContent = `以下文件无专用「整行单行」前缀映射，仍会执行①块注释清理；若还需去掉 # / -- 等单行注释，请开启③通用前缀、填写额外前缀，或补充扩展名映射：${noPrefixes.map((f) => f.name).join("、")}`;
  } else {
    warnUnknown.hidden = true;
    warnUnknown.textContent = "";
  }
}

/** @param {FileList|File[]} list */
function addFiles(list) {
  const incoming = Array.from(list);
  const seen = new Set(selectedFiles.map((f) => `${f.name}:${f.size}:${f.lastModified}`));
  for (const f of incoming) {
    const key = `${f.name}:${f.size}:${f.lastModified}`;
    if (!seen.has(key)) {
      seen.add(key);
      selectedFiles.push(f);
    }
  }
  renderFileList();
}

function getMergeOptions() {
  const orderEl = document.querySelector('input[name="order"]:checked');
  const sepEl = document.querySelector('input[name="sep"]:checked');
  return {
    order: orderEl?.value === "filename" ? "filename" : "selection",
    separator:
      sepEl?.value === "blank" ? "blank" : sepEl?.value === "filename" ? "filename" : "none",
  };
}

async function run() {
  copyStatus.textContent = "";
  if (!selectedFiles.length) {
    output.value = "";
    copyStatus.textContent = "请先选择文件。";
    return;
  }
  try {
    const chunks = await readFilesAsText(selectedFiles);
    const prefixOpts = getLinePrefixUiOptions();
    const text = runPipeline(chunks, {
      merge: getMergeOptions(),
      stripTrailingSlashSlash: Boolean(optTrailing?.checked),
      includeCommonLineCommentPrefixes: prefixOpts.includeCommon,
      extraLineCommentPrefixes: prefixOpts.extraPrefixes,
      stripBlockComments: optBlock ? optBlock.checked : true,
    });
    output.value = text;
    copyStatus.textContent = "已生成。";
  } catch (e) {
    output.value = "";
    copyStatus.textContent = e instanceof Error ? e.message : "生成失败";
  }
}

async function copyOutput() {
  copyStatus.textContent = "";
  const t = output.value;
  if (!t) {
    copyStatus.textContent = "没有可复制的内容。";
    return;
  }
  try {
    await navigator.clipboard.writeText(t);
    copyStatus.textContent = "已复制到剪贴板。";
  } catch {
    copyStatus.textContent = "复制失败：请使用 https 或 localhost 打开，并允许剪贴板权限。";
  }
}

dropzone?.addEventListener("click", () => fileInput?.click());

dropzone?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput?.click();
  }
});

fileInput?.addEventListener("change", () => {
  if (fileInput.files?.length) addFiles(fileInput.files);
  fileInput.value = "";
});

dropzone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone?.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone?.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
});

btnClear?.addEventListener("click", () => {
  selectedFiles = [];
  renderFileList();
  output.value = "";
  copyStatus.textContent = "";
});

btnRun?.addEventListener("click", () => {
  void run();
});

btnCopy?.addEventListener("click", () => {
  void copyOutput();
});

document.querySelectorAll('input[name="order"], input[name="sep"]').forEach((el) => {
  el.addEventListener("change", () => {
    if (output.value) void run();
  });
});

optTrailing?.addEventListener("change", () => {
  if (output.value) void run();
});

optBlock?.addEventListener("change", () => {
  renderFileList();
  if (output.value) void run();
});

optCommonPrefix?.addEventListener("change", () => {
  renderFileList();
  if (output.value) void run();
});

extraPrefixesInput?.addEventListener("input", () => {
  renderFileList();
  if (output.value) void run();
});

renderFileList();
