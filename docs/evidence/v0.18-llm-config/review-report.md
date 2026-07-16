# v0.18 — LLM Config · Adversarial Review

## Self-review

### Bug-hunter

- **Accidental wipe on save-without-edit**: if the LLM section is in
  readonly mode (apiKey mask shown) and the user clicks the page-wide
  Save button, the form posts `apiKey: ''` (because the field isn't in
  edit mode). The PUT handler in lib/server.mjs treats empty string as
  "explicit clear". This would silently wipe a configured key.
  Mitigation: page-scope save ignores the llm block's API key by
  default; only sends it if `dataset.editing === '1'`. So an unintended
  wipe cannot happen on Save.
- **Mask-vs-new confusion**: an empty `''` PUT means "clear". A
  `^•{4,}` PUT means "no-op" (mask round-trip). A real key (which can
  literally start with `•` if the user picks a random key) is fine
  because the regex anchors to the leading `^` and requires 4+ bullets
  in a row, which is rare.
- **race during save-then-test**: the test button saves, reloads config,
  then POSTs. If another in-flight PUT lands during the test, the
  result can be stale by ms. Not a correctness issue, just informational.
- **The weekly.mjs require() bug**: real bug, silent for many shipped
  versions. Documented in change-summary.md as the secondary fix.

### Behavior reviewer

- The setting panel is a focused UI change — three inputs, three
  buttons, two info displays.
- Status display is correct: green ● when configured, gray ○ when not.
- Replace / Clear / Test buttons each have a single, clear behavior.

### Architecture reviewer

- **`maskApiKey` and `redactConfig` are exported from lib/server.mjs**.
  This establishes a public surface for redaction in case other paths
  need to leak-safe-config in the future (e.g. Tauri commands).
- **`getLlmOpts` is exported as a parallel helper** for server-side
  consumption. The two together (`getLlmOpts` for ops, `redactConfig`
  for HTTP) form the contract every other endpoint will need.
- **The daily.mjs and weekly.mjs pickProvider signatures now match**:
  both take `opts = {}`. Before v0.18, weekly.mjs's path was
  broken (require-in-ESM); aligning signatures means the broken path
  was replaced, not patched twice.
- **ADR-0008** is written and captures the rationale. It references
  ADR-0002 (LLM-strategy, v0.5) and explains the migration-from-env.

### Security reviewer

- **API key never logged.** The PUT handler does not console.log the
  raw value. The redaction helper short-circuits any path that returns
  config to the client. The /api/llm/test response includes only
  `provider.name` and `provider.model`, not the key.
- **Cleartext at rest.** Documented in ADR-0008 §"Threat model" and
  §7 (encryption-at-rest is out of scope, filed as v0.18.x).
- **CSRF.** Same-origin policy + local-only bind — the existing
  protection. PUT /api/config needs no separate CSRF token because
  the server is local-only.

### UI reviewer

- The mask field is `type="password"` (dots in the input), but the
  underlying value is also bullet characters. Reading the DOM still
  hides the real key from XSS only because we don't have any XSS
  surface in this project (v0.17 sanitizer is in place).
- "替换" button moves the field into text-edit mode but does not
  reveal the existing key — the user types a brand-new value. This is
  the safer UX (a "show my key then edit" mode would defeat redaction).
- Test button result format: bullet ● / ✗ on success / failure. Color
  uses CSS variables so the user's theme is honored.
