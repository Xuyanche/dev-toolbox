## ADDED Requirements

### Requirement: AES and SM4 primary input keyboard execution
The system SHALL allow users to execute the current AES or SM4 encryption or decryption operation from the editable plaintext or ciphertext primary input by pressing `Ctrl+Enter`. Keyboard execution SHALL use the current algorithm, operation, mode, padding, encoding, key, and mode-parameter settings and SHALL match the primary action button's result, validation, and status feedback. This shortcut SHALL NOT be enabled for DES.

#### Scenario: Execute AES or SM4 from the primary input
- **WHEN** keyboard focus is in the editable plaintext or ciphertext primary input of AES or SM4 and the user presses `Ctrl+Enter` while text composition is inactive and no operation is already in progress
- **THEN** the system executes the current encryption or decryption operation once with all current settings

#### Scenario: Preserve symmetric input line breaks
- **WHEN** keyboard focus is in an AES or SM4 primary multiline input and the user presses Enter without Control
- **THEN** the system preserves normal line-break editing and does not execute encryption or decryption

#### Scenario: Exclude symmetric auxiliary inputs
- **WHEN** keyboard focus is in a key, IV, counter, nonce, or other symmetric parameter input and the user presses Enter or `Ctrl+Enter`
- **THEN** the system does not execute encryption or decryption

#### Scenario: Keep DES shortcut behavior unchanged
- **WHEN** keyboard focus is in the DES plaintext or ciphertext input and the user presses `Ctrl+Enter`
- **THEN** the system does not execute DES encryption or decryption through that shortcut

#### Scenario: Suppress duplicate or composing symmetric execution
- **WHEN** the user presses `Ctrl+Enter` in an AES or SM4 primary input while text composition is active or while the current cryptographic operation is already in progress
- **THEN** the system does not start another operation
