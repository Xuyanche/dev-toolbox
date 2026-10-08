## Context

See `proposal.md` for motivation. The current implementation has explicit parse/generate functions guarded by busy refs, primary action and clear buttons, `Ctrl+Enter` handlers, and mode-specific state. The recently implemented generation grid places Secret opposite Header and reserves separate rows for actions, operation status, result warning, and shared copy feedback. Parsing still uses nested columns with manual actions below the JWT input.

Automatic processing changes more than event wiring: JWT verification and signed generation are asynchronous, so a busy guard that simply ignores new requests can leave results tied to an older input. The workspace must also retain strict validation, local-only handling, signature trust semantics, independent mode state, stable copy feedback, IME safety, and the existing natural-flow fallback below 980px.

## Goals / Non-Goals

**Goals:**

- Make parse and generate modes exact two-column mirrors with primary JWT content occupying one full column and Header, Claims/Payload, and Secret sharing the other.
- Automatically process only relevant inputs after a short stabilization period while guaranteeing that only the latest snapshot can commit results.
- Preserve `Ctrl+Enter` as an immediate, non-duplicating execution path and keep plain Enter and IME composition safe.
- Reclaim action, status, and duplicate warning tracks for primary text content without destabilizing copy feedback or Secret messaging.
- Preserve a logical source, keyboard, and reading order when the layout becomes one column.

**Non-Goals:**

- Changing JWT encoding, signing, verification algorithms, clipboard behavior, or local-only handling.
- Removing Header previews, signature trust information, Secret title actions, or the shared copy feedback reservation.
- Automatically generating a Secret, persisting mode data, or coupling parse and generate state.
- Adding resizing handles, user-configurable column widths, or a new responsive breakpoint.

## Decisions

### 1. Use mirrored column structures for both modes

Parsing will retain two nested columns: the left column contains only the fill-height JWT field, while the right column contains compact Header, flexible Payload/registered-claim view, and compact Secret. Generation will use the inverse ownership: the left column contains compact Header, flexible Claims/Payload, and compact Secret, while the right column contains only the fill-height generated JWT field.

Nested columns give each side independent row sizing, so a compact Header or Secret never creates a shared horizontal track that constrains the opposite full-height JWT field. Source order naturally matches the narrow layout: parse input precedes parse results, and generation settings precede the generated result.

Keeping the current flat named generation grid was considered, but its shared rows couple unrelated left and right content. The mirror layout is simpler and maps directly to the requested mental model.

### 2. Allocate height to content rather than removed controls

Each results/settings column will use a compact content-driven Header track, `minmax(0, 1fr)` for Claims/Payload, and an automatic Secret track. The opposite JWT field will use the full column height. Long JWT, Claims, and result content will scroll internally.

The four primary action/clear buttons, operation-status rows, separate unsigned-warning block, and result-warning slot will be removed. The JWT and Claims/Payload field headings will each retain their copy action and add a compact delete icon matching the Secret delete treatment. Activating it clears only that primary input, its derived result/error state, and its copy feedback; it preserves the mode Secret, generation algorithm, and the other mode. The delete icon is disabled while its input is empty. Validation errors will use the existing primary field hint area; signature trust will stay below parsing Secret; unsigned generation risk will use a fixed-height line below generation Secret. The single shared copy-feedback row remains outside the column grid to prevent copy feedback from shifting fields.

Retaining proportional Header rows or empty action/status tracks was considered, but both spend additional height on secondary information instead of editable or generated content.

### 3. Debounce relevant input changes and process snapshots

An active-mode effect will observe only inputs that affect that mode: JWT and parsing Secret for parse mode; Claims/Payload, generation Secret, and algorithm for generate mode. It will cancel the previous timer and schedule processing after 300ms. View toggles, copy feedback, results, and unrelated mode state will not be dependencies.

Empty primary input is handled synchronously: empty JWT clears parse results and trust without an error; empty Claims/Payload clears the generated token and generation error while preserving Secret and algorithm. Non-empty primary input invalidates any stale output before scheduling a new snapshot.

Executing on every keydown without a stabilization period was considered, but it would repeatedly invoke Web Crypto while typing and make transient JSON/JWT errors noisy.

### 4. Commit only the latest asynchronous result

Parse and generation each receive a monotonically increasing revision. Every relevant input change, automatic schedule, or immediate shortcut invalidates older work. Executors accept explicit input snapshots and may update React state only when their captured revision still matches the current revision. Web Crypto work does not need to be aborted; stale completions are simply discarded.

The current busy-ref approach will not be used for automatic processing because ignoring a new request while an older request is pending can leave the interface permanently tied to stale input. Revision gating also lets Secret changes preserve parsed Header/Payload while withholding the old trust conclusion until the latest verification completes.

### 5. Treat `Ctrl+Enter` as an immediate flush

The existing primary-input shortcut remains available. An accepted `Ctrl+Enter` cancels the pending timer, advances the revision, and immediately processes the current snapshot. Plain Enter, IME composition, automatic-repeat keydown, and Secret-field keyboard events do not cause immediate execution. Secret changes still participate in normal debounced automatic processing.

Removing the shortcut was considered, but retaining it preserves the recently added workflow and gives users a deterministic way to bypass the 300ms delay without reintroducing visible primary action buttons.

### 6. Keep warnings compact and non-duplicated

Generation Secret always renders one fixed-height hint line. When Secret is empty, that line shows the unsigned-token warning in red; when Secret is non-empty, the line remains visually empty to avoid movement. The separate notice box and post-result unsigned warning will be removed. Parsing Secret keeps its richer non-box trust line because verified, invalid, unverified, unsigned, and unsupported states remain security-critical.

### 7. Preserve natural flow and verify rendered sizing

At and below the existing 980px breakpoint, fixed workspace height and internal column overflow will be disabled. Parse mode stacks JWT, Header, Payload, Secret; generation mode stacks Header, Claims/Payload, Secret, generated JWT. Component tests will cover timers, empty input, stale async completion, immediate shortcuts, absent buttons, Secret actions, and copy behavior. A focused browser check at representative desktop and narrow viewports will verify mirrored ownership, full-height use, internal scrolling, and absence of clipping or horizontal overflow.

## Risks / Trade-offs

- [Debounced timers make tests and rapid editing timing-sensitive] → Use fake timers for scheduling tests and snapshot revisions for deterministic result commitment.
- [Web Crypto work cannot be canceled] → Invalidate its revision immediately and discard any stale completion before state updates.
- [Automatically clearing output while typing can appear to flicker] → Clear stale output only for relevant input changes and regenerate once the 300ms timer settles; keep Header derivation immediate.
- [Automatic success announcements could overwhelm screen-reader users] → Keep routine success silent, use live status for validation/trust changes, and never announce the full generated token.
- [Compact inline warning text can wrap at narrow widths] → Let the Secret row grow in natural-flow mode while retaining a single non-box warning location.
- [Removing clear buttons changes how users reset a mode] → Treat an empty primary input as reset while preserving Secret, and keep dedicated Secret delete actions.
- [Users may expect the new title delete icon to clear the whole mode] → Give each icon a precise accessible label and limit it to the adjacent primary input plus derived results, preserving Secret and independent mode state.

## Migration Plan

No data or configuration migration is required. Implement snapshot executors and automatic scheduling first, then remove manual action rows and install the mirrored layout so behavior remains testable throughout. Update component tests and rendered layout checks before full validation. Rollback restores explicit action handlers and the prior layout; JWT state formats and generated tokens are unchanged.
