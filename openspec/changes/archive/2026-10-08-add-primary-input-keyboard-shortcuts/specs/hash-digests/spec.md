## ADDED Requirements

### Requirement: Primary digest input keyboard execution
The system SHALL allow users to calculate the currently selected MD5 or SHA digest from its primary editable input by pressing `Ctrl+Enter`. The keyboard-triggered calculation SHALL produce the same result, validation, and status feedback as activating the primary calculation button, SHALL preserve plain Enter for multiline editing, and SHALL NOT start a duplicate calculation while the current calculation is already in progress.

#### Scenario: Calculate a digest from the primary input
- **WHEN** keyboard focus is in the MD5 or SHA primary input and the user presses `Ctrl+Enter` while text composition is inactive and no calculation is in progress
- **THEN** the system starts one calculation for the current input

#### Scenario: Preserve digest input line breaks
- **WHEN** keyboard focus is in the MD5 or SHA primary multiline input and the user presses Enter without Control
- **THEN** the system inserts or preserves a line break and does not start a calculation

#### Scenario: Suppress duplicate or composing execution
- **WHEN** the user presses `Ctrl+Enter` while an input method editor is composing text or while the current digest calculation is already in progress
- **THEN** the system does not start another calculation
