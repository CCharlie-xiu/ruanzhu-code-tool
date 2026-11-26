## Cursor Cloud specific instructions

### Product

Static browser tool（软著代码整理）: no backend, no package manager, no lint/test/build toolchain. Serve the repo root over HTTP and open in a browser.

### Run

```bash
npx --yes serve .
# or: python3 -m http.server 8080
```

Do **not** open `index.html` via `file://` — ES modules and clipboard need localhost/https (see footer in `index.html`).

### Comment pipeline (order matters)

Configured in the UI「注释清理」rule group and executed by `js/pipeline/runPipeline.js`:

1. Cross-line block comments (`stripBlockComments`) — C-style and HTML
2. Empty lines (`dropEmptyLines`)
3. Full-line single-line prefixes (`stripFullLineComments` + `mergeLinePrefixes`)
4. Optional trailing `//` (`stripTrailingSlashSlashLines`)

Extend language prefixes in `js/rules/commentPrefixesByExt.js`; common prefixes in `js/rules/commonLinePrefixes.js`.

### Verify changes without a browser

```bash
node --input-type=module -e "import { runPipeline } from './js/pipeline/runPipeline.js'; console.log(runPipeline([{name:'t.js',ext:'js',text:'/** x */\nconst a=1;'}],{merge:{order:'selection',separator:'none'},stripTrailingSlashSlash:false}))"
```

### UI structure & tokens

Layout: `.app` is a two-column grid — a sticky `.masthead` (title + vertical `.flow-step` rail) on the left, the `.stack` of stages on the right. Stages are shown by `setStep()` in `js/main.js`; the old stages stay visible but dimmed (`.is-dimmed`) so the flow reads as one downward path.

`css/app.css` is layered top-down: palette (`--paper-*`, `--ink-*`, `--seal-*`) → semantic roles (`--surface-*`, `--text-*`, `--accent`, `--rule`) → components. Do not hardcode colors in component rules; add a token instead. `--text-mid` exists because `--text-3` alone fails contrast on the page background (`--surface-page`) — pick text colors by which surface they sit on.

`js/main.js` depends on these hooks; renaming them breaks the UI silently:
`#dropzone` `#file-input` `#file-list` `#warn-unknown` `#btn-clear` `#btn-continue` `#btn-copy` `#btn-download` `#output` `#stats` `#stat-files` `#stat-lines` `#stat-pages` `#stat-soft` `#stat-note` `#skeleton` `#copy-status` `#prefix-hint` `#extra-prefixes` `#opt-block` `#opt-common-prefix` `#opt-trailing`, plus `.flow-step[data-step]`, `.file-item` (`.name` / `.meta` / `.rm` / `.badge`), `.chip` radios named `order` and `sep`, `.toggle-row` siblings of a `.switch`, `.inline-msg` with `is-ok` / `is-warn` / `is-err`.

`?demo=1` seeds two sample files and runs the whole flow — use it for visual checks without touching the file picker.

