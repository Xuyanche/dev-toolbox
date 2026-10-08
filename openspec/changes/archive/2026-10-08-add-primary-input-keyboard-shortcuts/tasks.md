## 1. Shared Keyboard Execution Support

- [x] 1.1 Add a reusable primary-action keyboard matcher that distinguishes Ctrl+Enter from timestamp Enter, ignores IME composition and repeated keydown events, and prevents the accepted event's default behavior.
- [x] 1.2 Extend `TextAreaField` with optional primary-action and disabled inputs while preserving existing behavior for every consumer that does not opt in.
- [x] 1.3 Add focused tests for shortcut matching, ordinary textarea Enter behavior, IME composition, key repeat, and the opt-in/disabled shared-field contract.

## 2. Encoding and Digest Tools

- [x] 2.1 Connect URL, Unicode, and Base64 primary inputs to their existing encode/decode operation through Ctrl+Enter.
- [x] 2.2 Connect MD5 and SHA primary inputs to their existing calculation operation through Ctrl+Enter and ensure the current busy state blocks duplicate calculations.
- [x] 2.3 Extend encoding and hash interaction tests to cover shortcut execution, current option use, plain Enter line breaks, composition suppression, and busy-state suppression.

## 3. JWT and Symmetric Cryptography Tools

- [x] 3.1 Connect the JWT parse textarea and Claims/Payload generation textarea to their mode-specific existing operations through Ctrl+Enter, with per-operation pending guards and disabled primary buttons while pending.
- [x] 3.2 Verify in JWT interaction tests that both modes execute once, plain Enter edits text, Secret fields do not execute operations, and composing or pending operations reject duplicate shortcuts.
- [x] 3.3 Add optional primary-action handling to the symmetric plaintext/ciphertext field and enable it only for AES and SM4, with a pending guard shared by keyboard and button execution.
- [x] 3.4 Verify in symmetric interaction tests that AES and SM4 use all current settings, auxiliary fields and plain Enter do not execute, composing or pending operations do not overlap, and DES does not gain the shortcut.

## 4. Timestamp Tool

- [x] 4.1 Connect only the main timestamp conversion input to its existing conversion operation for both Enter and Ctrl+Enter while excluding the custom-format input.
- [x] 4.2 Extend timestamp interaction tests for both accepted shortcuts, current conversion settings, custom-format exclusion, and IME composition suppression.

## 5. JSON Tool

- [x] 5.1 Connect the unified JSON input to the existing format operation through Ctrl+Enter while preserving plain Enter and ignoring IME composition and repeated keydown events.
- [x] 5.2 Extend JSON interaction tests to cover shortcut formatting, invalid-input feedback, plain Enter, composition and repeat suppression, focus retention, and unchanged secondary button operations.

## 6. Verification

- [x] 6.1 Run the complete automated test suite and production build for the original shortcut scope, fixing any regressions without broadening that scope.
- [x] 6.2 Verify keyboard focus remains in each original primary input after execution and that button-triggered behavior remains unchanged across those tools.
- [x] 6.3 Re-run the complete automated test suite, lint, typecheck, and production build after adding JSON to the shortcut scope.
