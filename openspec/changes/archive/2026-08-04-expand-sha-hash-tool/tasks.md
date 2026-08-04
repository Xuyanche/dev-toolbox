## 1. SHA digest domain

- [x] 1.1 Define the ordered SHA-1/SHA-256/SHA-384/SHA-512 metadata and typed batch result model, then replace the single-algorithm function with an atomic parallel Web Crypto batch calculation over one UTF-8 encoding.
- [x] 1.2 Ensure unavailable Web Crypto or any individual digest failure returns one actionable error with no partial SHA result batch.
- [x] 1.3 Add standard known-vector tests for all four algorithms, uppercase variants, empty and Unicode input, output lengths, algorithm order and failure atomicity while preserving MD5 coverage.

## 2. Unified SHA interface

- [x] 2.1 Update the hash tool to accept `MD5 | SHA`, retain the existing MD5 layout, and render the SHA batch as four labeled algorithm cards with lowercase/uppercase outputs and independent copy actions.
- [x] 2.2 Implement SHA-specific busy, atomic replacement, empty-input, clear-all and differentiated security-warning behavior without changing MD5 semantics.
- [x] 2.3 Add responsive SHA result styles with safe long-digest wrapping and no horizontal page overflow.
- [x] 2.4 Add component tests for the four simultaneous results, labels and lengths, independent copying, replacement, clear-all, warning text, empty input and narrow-view availability.

## 3. Shell and navigation integration

- [x] 3.1 Rename the internal tool ID and all user-visible shell/home references from `sha1`/`SHA-1` to `sha`/`SHA`, update the tool description and icon, and retain its position after MD5.
- [x] 3.2 Update desktop/mobile navigation and state-retention tests for the exact `SHA` label/order, current-item semantics, keyboard access and narrow viewports.

## 4. Verification

- [x] 4.1 Run the full unit/component suite and resolve all regressions.
- [x] 4.2 Run TypeScript type checking, ESLint, the production build, diff checking and strict OpenSpec validation successfully.
- [x] 4.3 Manually verify MD5 remains unchanged and the SHA page displays, copies, replaces and clears all four algorithms correctly at desktop and narrow widths without network activity.

## 5. Compact vertical SHA result refinement

- [x] 5.1 Replace the SHA two-column result grid with a fixed single-column SHA-1/SHA-256/SHA-384/SHA-512 sequence, and reduce algorithm panel padding, heading gaps and row spacing without changing MD5.
- [x] 5.2 Restructure each lowercase/uppercase result into one compact horizontal row containing the variant label, full digest field and a copy icon button integrated at the field's right edge.
- [x] 5.3 Implement accessible icon-only copy controls with stable success/failure feedback, keyboard focus and complete digest copying, then update component and responsive tests for vertical order, compact row structure, no visible button text and narrow-view overflow safety.
- [x] 5.4 Run TypeScript checking, ESLint, the full test suite, production build, diff checking and `npx openspec validate expand-sha-hash-tool --strict`.
