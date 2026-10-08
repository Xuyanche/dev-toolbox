## ADDED Requirements

### Requirement: Primary JSON input keyboard execution
The system SHALL allow users to execute JSON formatting from the unified editable JSON input by pressing `Ctrl+Enter`. Keyboard execution SHALL use the current input and SHALL produce the same formatted text, tree result, validation, and status feedback as activating the primary “格式化 JSON” button. Plain Enter SHALL remain available for multiline editing, and the shortcut SHALL NOT invoke compression, escaping, or unescaping.

#### Scenario: Format JSON from the unified input
- **WHEN** keyboard focus is in the unified JSON input and the user presses `Ctrl+Enter` while text composition is inactive
- **THEN** the system executes JSON formatting once for the current input and keeps keyboard focus in that input

#### Scenario: Preserve JSON multiline editing
- **WHEN** keyboard focus is in the unified JSON input and the user presses Enter without Control
- **THEN** the system preserves normal line-break editing and does not execute a JSON operation

#### Scenario: Ignore composing or repeated JSON execution
- **WHEN** an input method editor is composing text or the Enter keydown is an automatic repeat while the user presses `Ctrl+Enter` in the unified JSON input
- **THEN** the system does not execute a JSON operation or interrupt text editing

#### Scenario: Report invalid shortcut input consistently
- **WHEN** the unified JSON input contains invalid JSON and the user presses `Ctrl+Enter`
- **THEN** the system preserves the malformed input, clears any stale tree result, and shows the same validation feedback as the “格式化 JSON” button
