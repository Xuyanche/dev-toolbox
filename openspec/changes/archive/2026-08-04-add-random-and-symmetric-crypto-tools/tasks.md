## 1. Shared foundations

- [x] 1.1 Extend the shared byte utilities with strict HEX and Base64 encode/decode plus strict UTF-8 decode, and add malformed-input tests.
- [x] 1.2 Implement an injectable `crypto.getRandomValues`-backed random source with unbiased inclusive integer sampling and 53-bit `[0, 1)` floating sampling.
- [x] 1.3 Add deterministic tests for random bounds, rejection sampling, unavailable browser crypto, and the absence of a `Math.random()` fallback.

## 2. Dice simulator

- [x] 2.1 Implement the supported-die model and atomic parser/formatter for single and `+`-joined dice expressions, including duplicate-type merging and validation errors.
- [x] 2.2 Implement mixed-pool rolling on the shared random source with grouped per-die results and a derived total.
- [x] 2.3 Add domain tests for all seven die sizes, mixed and duplicate expressions, invalid expressions, empty pools, result bounds, and totals.
- [x] 2.4 Build the `DiceSimulatorTool` with accessible quantity controls, quick-expression input, roll action, per-die output, total display, and status feedback.
- [x] 2.5 Add component tests for visual/text synchronization, invalid input preserving prior state, mixed rolls, and empty-pool handling.

## 3. Random number generator

- [x] 3.1 Implement request validation and generation for inclusive integers and half-open floating ranges, including the 10,000-item cap and impossible unique-integer detection.
- [x] 3.2 Implement efficient unique integer batching and bounded unique floating generation using the injectable random source.
- [x] 3.3 Add domain tests for defaults, boundaries, uniqueness on/off, invalid ranges and quantities, impossible requests, and replacement batch semantics.
- [x] 3.4 Build the `RandomNumberGeneratorTool` with defaults 1–100 / 1 / integer / unique, result list, copy-all action, and actionable validation feedback.
- [x] 3.5 Add component tests for default controls, integer/float switching, uniqueness, successful replacement, error behavior, and copying all results.

## 4. Symmetric cryptography domain

- [x] 4.1 Evaluate browser-compatible AES/DES/SM4 implementations against bundle size, maintenance, license, mode/padding coverage and known-vector correctness; add and pin the selected dependencies.
- [x] 4.2 Define the AES/DES/SM4 capability matrix and validated command types for key lengths, modes, padding, block alignment, and IV/counter/nonce requirements.
- [x] 4.3 Implement algorithm adapters behind the common byte interface for AES-CBC/CTR/GCM, DES-ECB/CBC, and SM4-ECB/CBC with PKCS#7 or no padding where specified.
- [x] 4.4 Normalize ciphertext and GCM authentication-tag conventions across adapters, and ensure authentication, padding, encoding and UTF-8 failures return structured errors without partial plaintext.
- [x] 4.5 Add standard known-vector tests for every supported algorithm/mode plus round-trip and negative tests for key length, mode parameter length, block alignment, padding, authentication and malformed encodings.

## 5. Symmetric cryptography interface

- [x] 5.1 Build the shared parameterized `SymmetricCryptoTool` for encrypt/decrypt operation, HEX/Base64 key selection, compatible mode/padding controls, encoded mode parameters, and HEX/Base64 ciphertext.
- [x] 5.2 Implement capability-driven form transitions so incompatible padding and IV/counter/nonce fields are reset or hidden explicitly when algorithm or mode changes.
- [x] 5.3 Add result copy/status behavior, actionable field errors, local-processing messaging, and the persistent DES legacy-security warning.
- [x] 5.4 Add component tests for each algorithm page, parameter visibility and transitions, valid encrypt/decrypt flows, validation failures, GCM failure handling, and the DES warning.

## 6. Shell integration and presentation

- [x] 6.1 Extend tool and group identifiers and add “随机数工具” with 色子模拟器/随机数生成器, followed by “对称加密” with AES/DES/SM4, before the existing “非对称加密” group while retaining RSA as the default active tool.
- [x] 6.2 Update desktop and mobile navigation tests for six groups, eleven tools, exact labels/order, current-item semantics, keyboard order, narrow-viewport access, and state preservation across tools.
- [x] 6.3 Add responsive styles for dice selectors, random controls/results, symmetric parameter grids, warnings and long result content using the existing visual system.
- [x] 6.4 Update browser capability messaging so random and symmetric operations fail clearly when required APIs are unavailable without incorrectly blocking independently supported tools.

## 7. Verification

- [x] 7.1 Run the full unit/component test suite and fix all regressions.
- [x] 7.2 Run TypeScript type checking, ESLint and the production build successfully.
- [x] 7.3 Manually verify all eleven tools and grouped navigation on desktop and narrow viewports, including local-only operation, accessibility labels, keyboard focus, copying, parameter compatibility, and session-state retention.

## 8. Interface refinements

- [x] 8.1 Update the shared panel heading typography so every tool panel title has a larger, clearer sans-serif hierarchy without regressing panel layout.
- [x] 8.2 Align the random-number generation controls and add a clear-results action that preserves the configured range, count, type and uniqueness.
- [x] 8.3 Default the dice pool and expression to `1d6`, move the expression control into the panel header at a compact desktop width, narrow each die quantity control, and add a clear-results action that preserves the pool.
- [x] 8.4 Convert desktop category headings into an accessible single-expanded disclosure navigation initialized to the RSA group, while preserving the existing mobile navigation and per-tool state.
- [x] 8.5 Add or update component tests for both clear actions, the `1d6` default, compact-control structure, disclosure state, keyboard accessibility and navigation/state behavior.
- [x] 8.6 Run the full tests, typecheck, lint, production build and strict OpenSpec validation, then resolve any regressions.

## 9. Dice control polish

- [x] 9.1 Vertically align the dice result total and clear-results button, and add a clear-dice action immediately after the expression apply button.
- [x] 9.2 Add component coverage proving clear-dice empties every die and the expression while leaving the result-clear behavior intact.
- [x] 9.3 Run focused tests, typecheck, lint, production build and strict OpenSpec validation.
