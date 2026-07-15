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

Configured in the UI fieldset「注释清理」and executed by `js/pipeline/runPipeline.js`:

1. Cross-line block comments (`stripBlockComments`) — C-style and HTML
2. Empty lines (`dropEmptyLines`)
3. Full-line single-line prefixes (`stripFullLineComments` + `mergeLinePrefixes`)
4. Optional trailing `//` (`stripTrailingSlashSlashLines`)

Extend language prefixes in `js/rules/commentPrefixesByExt.js`; common prefixes in `js/rules/commonLinePrefixes.js`.

### Verify changes without a browser

```bash
node --input-type=module -e "import { runPipeline } from './js/pipeline/runPipeline.js'; console.log(runPipeline([{name:'t.js',ext:'js',text:'/** x */\nconst a=1;'}],{merge:{order:'selection',separator:'none'},stripTrailingSlashSlash:false}))"
```
