## ADDED Requirements

### Requirement: Timestamp primary input keyboard execution
The system SHALL execute the current timestamp conversion when keyboard focus is in the main conversion input and the user presses Enter, whether or not Control is also pressed. Keyboard execution SHALL use the current conversion direction, unit, time zone, date mode, and custom format and SHALL produce the same result, validation, warning, and status feedback as activating the primary conversion button.

#### Scenario: Convert with Enter
- **WHEN** keyboard focus is in the main timestamp conversion input and the user presses Enter without Control while text composition is inactive
- **THEN** the system executes the current conversion once

#### Scenario: Convert with Control and Enter
- **WHEN** keyboard focus is in the main timestamp conversion input and the user presses `Ctrl+Enter` while text composition is inactive
- **THEN** the system executes the current conversion once

#### Scenario: Exclude the custom format input
- **WHEN** keyboard focus is in the custom date format input and the user presses Enter or `Ctrl+Enter`
- **THEN** the system does not execute timestamp conversion

#### Scenario: Ignore timestamp execution during composition
- **WHEN** an input method editor is composing text in the main timestamp conversion input and the user presses Enter or `Ctrl+Enter`
- **THEN** the system does not execute the conversion or interrupt the composition
