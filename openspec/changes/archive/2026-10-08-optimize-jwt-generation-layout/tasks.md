## 1. Implement automatic JWT processing

- [x] 1.1 Refactor parse and generation executors to accept explicit input snapshots and commit state only when their captured revision is still current.
- [x] 1.2 Add active-mode 300ms scheduling for JWT/parse-Secret changes and Claims/generate-Secret/algorithm changes, excluding result, view, and copy state.
- [x] 1.3 Handle empty JWT and Claims inputs synchronously by clearing stale results and errors while preserving the corresponding Secret and independent mode state.
- [x] 1.4 Retain `Ctrl+Enter` as an immediate flush that cancels the pending timer, processes the current primary-input snapshot once, and preserves Enter/IME/repeat behavior.

## 2. Build the mirrored buttonless workspace

- [x] 2.1 Remove parse, generate, and clear primary action rows plus their operation-status and duplicate result-warning slots without removing copy or Secret title actions.
- [x] 2.2 Arrange parse mode as fill-height JWT input on the left and compact Header, flexible Payload, compact Secret on the right.
- [x] 2.3 Arrange generate mode as compact Header, flexible Claims, compact Secret on the left and fill-height generated JWT on the right.
- [x] 2.4 Replace the generation warning box and duplicate result warning with one fixed-height red warning line below empty Secret, retaining blank spacing when Secret is present.
- [x] 2.5 Update desktop and narrow CSS so both columns use all available white workspace height, long content scrolls internally, and responsive semantic order remains accessible without horizontal overflow.

## 3. Update automated coverage

- [x] 3.1 Test debounced automatic parse and generation, including empty-primary-input reset and automatic Secret/algorithm refresh.
- [x] 3.2 Test latest-revision behavior by completing stale verification or generation work after a newer input snapshot and confirming it cannot overwrite current state.
- [x] 3.3 Test absent primary buttons, retained Secret/copy controls, compact unsigned warning, preserved mode state, and immediate non-duplicating `Ctrl+Enter` execution.
- [x] 3.4 Run a focused browser layout check at representative desktop and narrow viewports for mirrored ownership, flexible Claims sizing, full-column JWT fields, internal scrolling, and no unused bottom tracks.

## 4. Validate the revised change

- [x] 4.1 Run the focused JWT component and domain test suites and resolve all regressions.
- [x] 4.2 Run lint, type checking, the complete test suite, the production build, and patch integrity checks.
- [x] 4.3 Run strict OpenSpec validation and confirm all then-current tasks remain coherent.

## 5. Add primary-input title clear actions

- [x] 5.1 Add disabled-when-empty delete icons after the copy actions in the parsing JWT and generation Claims/Payload title rows.
- [x] 5.2 Make each delete action cancel pending work and clear only its primary input, derived results, errors, and copy feedback while preserving Secret, algorithm, and independent mode state.
- [x] 5.3 Cover both title actions and their state boundaries in component tests, then rerun focused tests, lint, type checking, build, patch integrity, and strict OpenSpec validation.
