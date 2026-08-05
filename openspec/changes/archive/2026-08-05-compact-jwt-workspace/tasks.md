## 1. Establish the merged JWT baseline

- [x] 1.1 Review the current compact JSON implementation state and preserve the completed removal of the JWT top local-processing notice and its updated tests.
- [x] 1.2 Map the parse, generation, trust, Secret, clear, and copy states to the workspace structure without changing their independent reset boundaries.

## 2. Build the initial text copy interactions

- [x] 2.1 Add the initial reusable JWT text-region copy wrapper with the MD5-style icon, accessible name and title, keyboard focus styling, disabled empty state, and stable feedback.
- [x] 2.2 Add copy controls to parse JWT, parsed Header/Payload, parse Secret, generated Header preview, Claims/Payload input, generation Secret, and generated JWT.
- [x] 2.3 Consolidate copy success and failure messages into stable per-mode feedback slots without exposing Secret values.

## 3. Build the bidirectional workspace baseline

- [x] 3.1 Rebuild parsing mode as an always-present two-column workspace with JWT input on the left and ordered algorithm/trust, Header, Payload, registered Claim summary, and parse Secret content on the right.
- [x] 3.2 Derive the parsing algorithm from the Header, preserve every trust state, and render stable empty Header/Payload placeholders.
- [x] 3.3 Rebuild generation mode with ordered algorithm, derived Header, Claims/Payload, Secret, warning, and actions on the left and an always-present JWT result on the right.
- [x] 3.4 Preserve Secret clear/generation behavior, unsigned warnings, clear-generation Secret retention, and independent parse/generate state.

## 4. Establish responsive sizing and visual stability

- [x] 4.1 Add the shared equal-width desktop grid and workspace-height rules.
- [x] 4.2 Allocate flexible internal space to JWT, Header, and Payload regions with internal scrolling.
- [x] 4.3 Add the narrow-viewport breakpoint with semantic natural-height stacking.
- [x] 4.4 Visually verify empty, success, invalid-signature, unsigned, long-content, and clipboard states on desktop and mobile.

## 5. Validate the completed baseline

- [x] 5.1 Cover column order, shared workspace hooks, stable empty results, algorithm/trust display, and Payload-integrated Claim summaries.
- [x] 5.2 Cover every initial copy target, disabled empty controls, accessibility, clipboard failures, and masked Secret copying.
- [x] 5.3 Preserve tests for local-only operation, malformed input, trust states, unsigned generation, Secret behavior, and mode isolation.
- [x] 5.4 Run targeted and full tests, type checking, linting, and production build.
- [x] 5.5 Inspect overlapping worktree changes and run strict OpenSpec validation.

## 6. Move text actions into field headings

- [x] 6.1 Refactor the JWT text-region abstraction so the copy button is rendered in the field heading outside the input/output border, with no content padding reserved for an overlaid icon.
- [x] 6.2 Migrate all parse and generation copy targets to heading action groups and remove conflicting heading-aside text such as read-only and combined-content descriptions.
- [x] 6.3 Add the shared accessible delete icon treatment with title, aria-label, focus-visible styling, and disabled empty state.

## 7. Consolidate Payload and Secret controls

- [x] 7.1 Replace the separate registered Claim summary box with a stable Payload/registered-Claim switch that reuses one flexing result region and defaults back to Payload for a new, cleared, or failed parse.
- [x] 7.2 Make the shared result copy control follow the active view, copy complete visible Payload or registered-Claim summary text, and disable it for an empty registered-Claim view.
- [x] 7.3 Move generation Secret actions into its heading in Generate/Copy/Delete order, move parse Secret Copy/Delete into its heading, and preserve each delete action's narrow state-clearing boundary.

## 8. Reallocate space and verify the revision

- [x] 8.1 Remove the generation Secret action row and old Claim-summary grid track, then reallocate the released desktop height to Header and Payload while preserving equal mode heights and narrow-screen natural stacking.
- [x] 8.2 Update JWT component tests for every heading action, action order, active-view switching/copying, empty states, Secret deletion boundaries, and removal of obsolete labels and containers.
- [x] 8.3 Visually verify parse and generation modes with empty, long, registered-Claim, Secret, clipboard-feedback, desktop, and mobile states.
- [x] 8.4 Run targeted tests, the full suite, type checking, linting, production build, diff checks, and strict OpenSpec validation.

## 9. Relocate algorithm and parsing trust controls

- [x] 9.1 Move the generation algorithm selector from the settings column to the right side of the mode operation row, render it only in generation mode, and preserve the selected algorithm across mode changes.
- [x] 9.2 Remove the parsing algorithm/signature-verification container and render every trust state as an unframed status line below the parsing Secret.
- [x] 9.3 Change the parsing Secret placeholder to “UTF-8文本密钥，留空则不做校验”, and invalidate any previous trust conclusion when that Secret is edited or deleted until the user parses again.

## 10. Fill the workspace and guarantee Header visibility

- [x] 10.1 Establish a definite-height desktop chain from the workspace shell through the two-column grid and each column, prevent column-level scrolling, and keep scrolling inside text bodies only.
- [x] 10.2 Remove obsolete algorithm/trust grid tracks, give parsed and generated Header regions enough minimum height for a common four-line formatted Header, and allocate the remaining flexible height primarily to Payload.
- [x] 10.3 Restore natural height, visible overflow, semantic stacking, and usable wrapping for the mode/algorithm toolbar at the narrow-screen breakpoint.

## 11. Verify the compact workspace revision

- [x] 11.1 Update JWT component tests for conditional algorithm placement, removal of parsing status containers, Secret placeholder and stale-trust invalidation, preserved parsed content, and trust refresh after reparse.
- [x] 11.2 Visually verify both modes fill the equal-height desktop workspace, common Headers display completely, long text scrolls only inside its body, and mobile content remains uncropped.
- [x] 11.3 Run targeted and full tests, type checking, linting, production build, diff checks, and strict OpenSpec validation.
