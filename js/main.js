/**
 * 应用入口：单向流程 DOM + io / pipeline。
 * 心智模型：选文件 → 整理规则 → 取结果（不左右横跳、不走回头路）。
 */

import { readFilesAsText } from "./io/fileReader.js";
import { runPipeline } from "./pipeline/runPipeline.js";
import { hasExtSpecificCommentRule } from "./rules/commentPrefixesByExt.js";
import { mergeLinePrefixes } from "./rules/mergeLinePrefixes.js";

/** 软著鉴别材料常见参考：每页 50 行 */
const LINES_PER_PAGE = 50;
const SOFT_PAGES_TARGET = 60;

/** @type {File[]} */
let selectedFiles = [];
/** @type {1 | 2 | 3} */
let currentStep = 1;
let runToken = 0;

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const btnClear = document.getElementById("btn-clear");
const btnContinue = document.getElementById("btn-continue");
const btnCopy = document.getElementById("btn-copy");
const btnDownload = document.getElementById("btn-download");
const output = document.getElementById("output");
const fileList = document.getElementById("file-list");
const warnUnknown = document.getElementById("warn-unknown");
const copyStatus = document.getElementById("copy-status");
const optTrailing = document.getElementById("opt-trailing");
const optBlock = document.getElementById("opt-block");
const optCommonPrefix = document.getElementById("opt-common-prefix");
const extraPrefixesInput = document.getElementById("extra-prefixes");
const prefixHint = document.getElementById("prefix-hint");
const stageFiles = document.getElementById("stage-files");
const stageRules = document.getElementById("stage-rules");
const stageResult = document.getElementById("stage-result");
const skeleton = document.getElementById("skeleton");
const statsEl = document.getElementById("stats");
const statFiles = document.getElementById("stat-files");
const statLines = document.getElementById("stat-lines");
const statPages = document.getElementById("stat-pages");
const statSoft = document.getElementById("stat-soft");
const statNote = document.getElementById("stat-note");

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** @param {number} n */
function formatInt(n) {
  return new Intl.NumberFormat("zh-CN").format(n);
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

/** @param {1 | 2 | 3} step */
function setStep(step) {
  currentStep = step;

  document.querySelectorAll(".flow-step").forEach((el) => {
    const n = Number(el.getAttribute("data-step"));
    el.classList.toggle("is-active", n === step);
    el.classList.toggle("is-done", n < step);
  });

  if (stageRules) {
    stageRules.hidden = step < 2;
    stageRules.classList.toggle("is-dimmed", step !== 2);
    stageRules.classList.toggle("is-focus", step === 2);
  }
  if (stageResult) {
    stageResult.hidden = step < 3;
    stageResult.classList.toggle("is-dimmed", step !== 3);
    stageResult.classList.toggle("is-focus", step === 3);
  }
  if (stageFiles) {
    stageFiles.classList.toggle("is-dimmed", step !== 1);
    stageFiles.classList.toggle("is-focus", step === 1);
  }

  if (step >= 2) {
    stageRules?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (step >= 3) {
    // slight delay so rules paint first in the mental model
    requestAnimationFrame(() => {
      stageResult?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
}

function setBusy(busy) {
  if (!skeleton || !output) return;
  skeleton.hidden = !busy;
  output.hidden = busy;
  if (statsEl) statsEl.hidden = busy || !output.value;
}

function updateActions() {
  const hasFiles = selectedFiles.length > 0;
  const hasOut = Boolean(output?.value);
  if (btnClear) btnClear.disabled = !hasFiles;
  if (btnContinue) btnContinue.disabled = !hasFiles;
  if (btnCopy) btnCopy.disabled = !hasOut;
  if (btnDownload) btnDownload.disabled = !hasOut;
}

function validateInline() {
  if (!warnUnknown) return;
  if (!selectedFiles.length) {
    warnUnknown.hidden = true;
    warnUnknown.textContent = "";
    return;
  }

  const prefixOpts = getLinePrefixUiOptions();
  const blockOn = optBlock ? optBlock.checked : true;
  const noPrefixes = selectedFiles.filter(
    (f) => mergeLinePrefixes(fileExtFromName(f.name), prefixOpts).length === 0,
  );

  if (noPrefixes.length && !blockOn) {
    warnUnknown.hidden = false;
    warnUnknown.textContent = `行内校验：${noPrefixes.map((f) => f.name).join("、")} 无整行前缀且未开块注释清理，结果可能几乎原样输出。`;
  } else if (noPrefixes.length) {
    warnUnknown.hidden = false;
    warnUnknown.textContent = `行内校验：${noPrefixes.map((f) => f.name).join("、")} 无专用单行前缀；仍会清块注释。需 # / -- 请开整行单行或填额外前缀。`;
  } else {
    warnUnknown.hidden = true;
    warnUnknown.textContent = "";
  }

  if (prefixHint) {
    const extras = parseExtraPrefixes(extraPrefixesInput?.value ?? "");
    if (extras.some((p) => p.length > 8)) {
      prefixHint.hidden = false;
      prefixHint.className = "inline-msg is-warn";
      prefixHint.textContent = "前缀过长，可能误删正常代码行。";
    } else if (extras.length) {
      prefixHint.hidden = false;
      prefixHint.className = "inline-msg is-ok";
      prefixHint.textContent = `已叠加 ${extras.length} 个额外前缀。`;
    } else {
      prefixHint.hidden = true;
      prefixHint.textContent = "";
    }
  }
}

function renderFileList() {
  if (!fileList) return;
  fileList.innerHTML = "";

  selectedFiles.forEach((f, index) => {
    const row = document.createElement("div");
    row.className = "file-item";

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = f.name;
    name.title = f.name;

    const metaWrap = document.createElement("span");
    metaWrap.style.display = "inline-flex";
    metaWrap.style.alignItems = "center";
    metaWrap.style.gap = "0.4rem";

    const ext = fileExtFromName(f.name);
    if (!hasExtSpecificCommentRule(ext)) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "通用规则";
      metaWrap.appendChild(badge);
    }

    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = formatBytes(f.size);
    metaWrap.appendChild(meta);

    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "rm";
    rm.setAttribute("aria-label", `移除 ${f.name}`);
    rm.textContent = "×";
    rm.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedFiles.splice(index, 1);
      renderFileList();
      updateActions();
      if (!selectedFiles.length) {
        resetResult();
        setStep(1);
      } else if (currentStep >= 2) {
        void run();
      }
    });

    row.appendChild(name);
    row.appendChild(metaWrap);
    row.appendChild(rm);
    fileList.appendChild(row);
  });

  validateInline();
  updateActions();
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
  if (selectedFiles.length && currentStep === 1) {
    // progressive: stay on step 1 until user continues — closed loop without jump-back
  }
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

function resetResult() {
  if (output) output.value = "";
  if (copyStatus) {
    copyStatus.textContent = "";
    copyStatus.className = "inline-msg";
  }
  if (statsEl) statsEl.hidden = true;
  if (statNote) {
    statNote.hidden = true;
    statNote.textContent = "";
  }
  setBusy(false);
  updateActions();
}

/** @param {string} text */
function updateStats(text) {
  const lines = text ? text.split(/\r?\n/).length : 0;
  const pages = lines === 0 ? 0 : Math.ceil(lines / LINES_PER_PAGE);

  if (statFiles) statFiles.textContent = formatInt(selectedFiles.length);
  if (statLines) statLines.textContent = formatInt(lines);
  if (statPages) statPages.textContent = formatInt(pages);
  if (statSoft) statSoft.textContent = `${LINES_PER_PAGE}×${SOFT_PAGES_TARGET}`;
  if (statsEl) statsEl.hidden = false;

  if (statNote) {
    if (lines === 0) {
      statNote.hidden = true;
      return;
    }
    statNote.hidden = false;
    if (pages < SOFT_PAGES_TARGET) {
      statNote.className = "inline-msg is-warn";
      statNote.textContent = `约 ${pages} 页（按 ${LINES_PER_PAGE} 行/页），不足常见 ${SOFT_PAGES_TARGET} 页交存习惯，可再加源文件。`;
    } else if (pages > SOFT_PAGES_TARGET) {
      statNote.className = "inline-msg";
      statNote.textContent = `约 ${pages} 页。交存时常取前 30 + 后 30 页，请在 Word 中截取并加页眉页码。`;
    } else {
      statNote.className = "inline-msg is-ok";
      statNote.textContent = `约 ${pages} 页，接近常见交存页数；粘贴后请自检页眉与页码。`;
    }
  }
}

async function run() {
  if (!selectedFiles.length) {
    resetResult();
    if (copyStatus) {
      copyStatus.className = "inline-msg is-err";
      copyStatus.textContent = "请先选择文件。";
    }
    return;
  }

  const token = ++runToken;
  setBusy(true);
  if (copyStatus) {
    copyStatus.className = "inline-msg";
    copyStatus.textContent = "";
  }

  // Keep shimmer visible briefly so spatial “loading → result” relation is readable
  const minSpin = new Promise((r) => setTimeout(r, 420));

  try {
    const [chunks] = await Promise.all([readFilesAsText(selectedFiles), minSpin]);
    if (token !== runToken) return;

    const prefixOpts = getLinePrefixUiOptions();
    const text = runPipeline(chunks, {
      merge: getMergeOptions(),
      stripTrailingSlashSlash: Boolean(optTrailing?.checked),
      includeCommonLineCommentPrefixes: prefixOpts.includeCommon,
      extraLineCommentPrefixes: prefixOpts.extraPrefixes,
      stripBlockComments: optBlock ? optBlock.checked : true,
    });

    if (output) {
      output.hidden = false;
      output.value = text;
    }
    setBusy(false);
    updateStats(text);
    updateActions();
    if (copyStatus) {
      copyStatus.className = "inline-msg is-ok";
      copyStatus.textContent = "已生成，可复制或下载。";
    }
  } catch (e) {
    if (token !== runToken) return;
    setBusy(false);
    if (output) output.value = "";
    if (statsEl) statsEl.hidden = true;
    updateActions();
    if (copyStatus) {
      copyStatus.className = "inline-msg is-err";
      copyStatus.textContent = e instanceof Error ? e.message : "生成失败";
    }
  }
}

async function copyOutput() {
  const t = output?.value ?? "";
  if (!t) {
    if (copyStatus) {
      copyStatus.className = "inline-msg is-err";
      copyStatus.textContent = "没有可复制的内容。";
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(t);
    if (copyStatus) {
      copyStatus.className = "inline-msg is-ok";
      copyStatus.textContent = "已复制到剪贴板。";
    }
  } catch {
    if (copyStatus) {
      copyStatus.className = "inline-msg is-err";
      copyStatus.textContent = "复制失败：请允许剪贴板权限（需 https / localhost）。";
    }
  }
}

function downloadTxt() {
  const t = output?.value ?? "";
  if (!t) return;
  const blob = new Blob([t], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ruanzhu-code.txt";
  a.click();
  URL.revokeObjectURL(url);
  if (copyStatus) {
    copyStatus.className = "inline-msg is-ok";
    copyStatus.textContent = "已开始下载 ruanzhu-code.txt。";
  }
}

function goContinue() {
  if (!selectedFiles.length) return;
  setStep(2);
  setStep(3);
  void run();
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
dropzone?.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone?.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
});

btnClear?.addEventListener("click", () => {
  selectedFiles = [];
  renderFileList();
  resetResult();
  setStep(1);
});

btnContinue?.addEventListener("click", () => goContinue());
btnCopy?.addEventListener("click", () => void copyOutput());
btnDownload?.addEventListener("click", () => downloadTxt());

function onOptionsChanged() {
  validateInline();
  if (currentStep >= 3 && selectedFiles.length) void run();
}

document.querySelectorAll('input[name="order"], input[name="sep"]').forEach((el) => {
  el.addEventListener("change", onOptionsChanged);
});
optTrailing?.addEventListener("change", onOptionsChanged);
optBlock?.addEventListener("change", onOptionsChanged);
optCommonPrefix?.addEventListener("change", onOptionsChanged);
extraPrefixesInput?.addEventListener("input", onOptionsChanged);

renderFileList();
setStep(1);
updateActions();

/** Demo seed: ?demo=1 — 便于预览骨架与闭环，不依赖本机文件选择器 */
if (new URLSearchParams(location.search).has("demo")) {
  const js = `/**
 * Sample module for soft copyright demo
 * @author demo
 */
function hello(name) {
  // greet user
  const msg = "hi " + name; // trailing
  return msg;
}

/* block
   comment */
export { hello };
`;
  const py = `# demo python
def add(a, b):
    """docstring"""
    # sum
    return a + b

`;
  addFiles([
    new File([js], "a.js", { type: "text/javascript" }),
    new File([py], "b.py", { type: "text/x-python" }),
  ]);
  goContinue();
}
