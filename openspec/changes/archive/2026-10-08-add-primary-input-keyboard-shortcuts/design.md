## Context

The affected tools currently expose their primary operations only through explicit buttons. URL, Unicode, Base64, MD5, and SHA use the shared `TextAreaField`; JSON, JWT, and symmetric cryptography render specialized textarea controls; timestamp conversion uses a specialized single-line input. Operation functions already centralize validation and result updates, so keyboard activation can delegate to those functions without changing domain logic.

The shortcut must remain scoped to primary inputs. Several affected pages also contain sensitive or structural auxiliary inputs where Enter must retain its existing behavior. AES, SM4, and disabled-by-default DES share one component even though DES is explicitly outside this change.

## Goals / Non-Goals

**Goals:**

- Express shortcut matching consistently across shared and specialized fields.
- Route keyboard activation through the same operation functions as primary buttons.
- Preserve textarea newline editing, IME composition, focus, and existing validation feedback.
- Make asynchronous keyboard execution single-flight and ignore auto-repeated keydown events.

**Non-Goals:**

- Adding global document-level shortcuts or activating a tool when focus is outside its primary input.
- Adding `Cmd+Enter`, changing button shortcuts, or changing domain algorithms and validation.
- Refactoring all input components into one component or enabling the shortcut for DES, RSA, or other tools.

## Decisions

### 1. Match shortcuts at the focused primary control

Each primary editable control will handle its own keyboard event. Multiline controls execute only when `event.key` is Enter and Control is pressed; the timestamp control accepts Enter with or without Control. Matching handlers ignore composing and repeated keyboard events and call `preventDefault()` only after a shortcut is accepted.

This keeps scope explicit and prevents bubbling or global listeners from executing a tool while focus is in a Secret, key, IV, custom-format, output, or unrelated field. A page-level listener was considered, but it would require fragile target classification and could interfere with nested controls.

### 2. Add opt-in execution support to shared field primitives

`TextAreaField` will expose an optional primary-action callback and disabled state. When omitted, its current behavior is unchanged, so existing consumers outside this change do not gain a shortcut. A small shared keyboard predicate or handler factory will express the matching, composition, repeat, and default-prevention rules for specialized JWT, symmetric, and timestamp controls as well.

Duplicating ad hoc `onKeyDown` conditions in every page was considered, but a shared predicate gives the edge cases one definition while leaving operation ownership in each tool.

### 3. Reuse the existing operation functions

Shortcut callbacks will invoke the same existing operation function as the matching primary button. For JSON, `Ctrl+Enter` invokes formatting because “格式化 JSON” is the primary action; compression, escaping, and unescaping remain explicit secondary actions. No conversion, JSON, digest, JWT, timestamp, or cryptographic logic will move into keyboard handlers. This ensures buttons and shortcuts cannot drift in validation, output clearing, warnings, or status feedback.

### 4. Preserve explicit algorithm and field scope

Encoding and hash pages pass the callback only to their editable shared input. JSON attaches it only to the unified JSON textarea and maps it to formatting. JWT attaches it only to the JWT parse textarea and Claims/Payload generation textarea. Symmetric cryptography attaches it only when `algorithm` is AES or SM4 and only to the editable plaintext/ciphertext textarea. Timestamp attaches it only to the main conversion input, not the custom-format field.

Allowing every consumer of the shared symmetric component to inherit the shortcut was considered, but that would silently add DES behavior beyond the agreed scope.

### 5. Guard asynchronous operations

Hash retains its existing busy state and uses it to disable shortcut execution. JWT parse/generate and symmetric operations will track the applicable pending state so accepted shortcuts cannot start overlapping work; their primary buttons will reflect the same pending state. Repeated keydown events are ignored before invoking an operation.

Only suppressing keyboard auto-repeat was considered, but separate rapid key presses could still overlap asynchronous verification or cryptographic work.

## Risks / Trade-offs

- [Users may not discover an unlabelled shortcut] → Keep the first implementation behavior-focused; shortcut hint text can be added later if usability feedback shows it is needed.
- [Shared input changes could affect unrelated tools] → Make every new field prop optional and cover unchanged plain-Enter behavior for consumers without a callback.
- [React state updates may not block two events in the same render interval] → Pair visible busy state with a synchronous in-flight guard where an operation can await.
- [Keyboard behavior can vary during IME composition] → Check composition state on the native keyboard event and cover it with interaction tests.

## Migration Plan

No data or configuration migration is required. Ship the optional shared-field API and tool integrations together. Rollback consists of removing the opt-in keyboard callbacks and asynchronous guards; existing buttons remain the stable fallback throughout.
