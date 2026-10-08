## Why

The most frequently used text-processing tools currently require users to leave the input field and activate a button before each operation. Adding focused keyboard execution shortcuts makes repeated conversions, hashing, token work, and encryption faster while preserving normal multiline editing behavior.

## What Changes

- Allow `Ctrl+Enter` in the primary editable input of URL, Unicode, Base64, JSON, MD5, SHA, JWT, AES, and SM4 tools to run the same operation as the current primary action button.
- Keep plain `Enter` available for inserting line breaks in every multiline primary input.
- Allow either `Enter` or `Ctrl+Enter` in the timestamp conversion input to run the current conversion.
- Limit shortcut handling to each tool's primary input; auxiliary inputs such as JWT secrets, symmetric keys and mode parameters, and the custom timestamp format remain unaffected.
- Ignore execution shortcuts while an input method editor is composing text and prevent duplicate execution of an operation that is already busy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `text-encoding`: URL, Unicode, and Base64 primary inputs gain keyboard execution behavior.
- `json-tool`: The unified JSON input gains keyboard execution of the primary formatting action.
- `hash-digests`: MD5 and SHA primary inputs gain keyboard execution behavior with busy-state protection.
- `jwt-tool`: The active parse or generate primary input gains mode-appropriate keyboard execution behavior.
- `symmetric-cryptography`: AES and SM4 plaintext/ciphertext primary inputs gain keyboard execution behavior without changing auxiliary parameter fields.
- `timestamp-conversion`: The main conversion input gains both unmodified Enter and Ctrl+Enter execution behavior.

## Impact

- Affected UI code: shared textarea field support plus the encoding, JSON, hash, JWT, symmetric-cryptography, and timestamp tool components.
- Affected tests: interaction coverage for positive shortcuts, ordinary multiline Enter behavior, auxiliary-field exclusions, IME composition, and repeated/busy execution.
- No domain algorithms, public APIs, runtime configuration, persistence, network behavior, or package dependencies change.
- DES remains outside the requested shortcut scope even though it shares the symmetric tool component; the implementation must preserve that distinction.
