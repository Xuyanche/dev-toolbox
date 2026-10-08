## ADDED Requirements

### Requirement: Mode-aware JWT primary input keyboard execution
The system SHALL allow users to execute the active JWT mode from that mode's primary editable input by pressing `Ctrl+Enter`: the JWT input SHALL run parsing and verification in parse mode, and the Claims/Payload JSON input SHALL run token generation in generate mode. Keyboard execution SHALL match the corresponding primary action button's validation, results, warnings, and status feedback; plain Enter SHALL remain available for multiline editing.

#### Scenario: Parse from the JWT input
- **WHEN** parse mode is active, keyboard focus is in the JWT input, and the user presses `Ctrl+Enter` while text composition is inactive and parsing is not already in progress
- **THEN** the system parses and, when applicable, verifies the current JWT once

#### Scenario: Generate from the Claims input
- **WHEN** generate mode is active, keyboard focus is in the Claims/Payload JSON input, and the user presses `Ctrl+Enter` while text composition is inactive and generation is not already in progress
- **THEN** the system generates one JWT using the current Claims, algorithm, and Secret settings

#### Scenario: Preserve JWT multiline editing
- **WHEN** keyboard focus is in either JWT primary multiline input and the user presses Enter without Control
- **THEN** the system preserves normal line-break editing and does not execute the active mode

#### Scenario: Exclude JWT auxiliary fields
- **WHEN** keyboard focus is in a JWT Secret field and the user presses Enter or `Ctrl+Enter`
- **THEN** the system does not execute JWT parsing or generation

#### Scenario: Suppress duplicate or composing JWT execution
- **WHEN** the user presses `Ctrl+Enter` in an active JWT primary input while text composition is active or while that mode's operation is already in progress
- **THEN** the system does not start another operation
