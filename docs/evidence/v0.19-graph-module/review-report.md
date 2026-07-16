# v0.19 — Knowledge Graph Module · Adversarial Review

## Self-review

### Bug-hunter

- **Reasons as Set bug** — original returned `reasons` as a `Set` for
  top-level edges but as an `Array` for adjacency entries. JSON would
  lose the Set's contents. v0.19 normalizes to Array. Caught by
  `multi-reason reasons` test which compared `g.edges[0].reasons.sort()`
  to the expected array.
- **Bare-slug wikilink edge case** — when `[[bob]]` is used and a
  same-named entity exists in any type, the resolver picks it up.
  Tested.
- **Cross-type wikilink resolution** — `[[task/buy-milk]]` resolves
  regardless of which type the source entity is. Tested.
- **Ghost wikilinks** — `[[nobody-here]]` produces no edge. The
  wikilink source's `degree` stays 0. Tested.

### Behavior reviewer

- Backward compatibility verified by inspecting call sites: the
  function signature is identical (`state` → `g`), the return shape
  is identical. No call site needed updating.

### Architecture reviewer

- **Module boundaries** — the function is now discoverable via
  `grep -rn "function buildGraph"` finds it in two places
  (intentional duplication, matches project pattern). A future
  contributor who hits an inconsistency can clearly identify the
  pair to update.
- **No new deps.** Same 3-dep budget.
- **Deterministic** — pure function, no time/randomness, easy to test.

### Security reviewer

- No new attack surface. The graph builder is read-only over entity
  data the cockpit already has.
- Wikilinks are matched against vault-internal slugs. A malicious
  body that says `[[../../etc/passwd]]` resolves to nothing (no
  matching entity) and adds no edge. Tested: `ghost wikilink
  produces no edge`.

### UI reviewer
N/A — no visible change.
