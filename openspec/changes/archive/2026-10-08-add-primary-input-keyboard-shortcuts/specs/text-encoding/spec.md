## ADDED Requirements

### Requirement: Primary encoding input keyboard execution
The system SHALL allow users to execute the currently selected encode or decode operation from the primary editable input of the URL, Unicode, and Base64 tools by pressing `Ctrl+Enter`. The keyboard-triggered operation SHALL use the current direction and options and SHALL produce the same result, validation, and status feedback as activating the primary action button.

#### Scenario: Execute an encoding operation from the primary input
- **WHEN** keyboard focus is in the primary editable input of the URL, Unicode, or Base64 tool and the user presses `Ctrl+Enter` while text composition is inactive
- **THEN** the system executes that tool's currently selected encode or decode operation once using the current input and settings

#### Scenario: Preserve multiline editing
- **WHEN** keyboard focus is in an encoding tool's primary multiline input and the user presses Enter without Control
- **THEN** the system preserves the normal line-break editing behavior and does not execute the operation

#### Scenario: Ignore a shortcut during text composition
- **WHEN** an input method editor is composing text in an encoding tool's primary input and the user presses `Ctrl+Enter`
- **THEN** the system does not execute the operation or interrupt the composition
