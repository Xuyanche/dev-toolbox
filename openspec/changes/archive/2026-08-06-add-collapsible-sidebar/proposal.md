## Why

Desktop tool pages currently reserve a fixed left navigation column at all times, which leaves less room for wide workspaces such as JSON and JWT. Users need a way to temporarily reclaim that space without losing quick access to the grouped navigation.

## What Changes

- Add a desktop-only pin control for keeping the left sidebar fixed or allowing it to collapse after pointer exit.
- Keep the current full-width sidebar layout when expanded.
- In the collapsed state, reduce the sidebar to a narrow left rail so the main functional area can use nearly the full screen width.
- Allow the collapsed sidebar to temporarily open as an overlay when the pointer enters the rail or sidebar area.
- Ensure temporary overlay expansion does not resize or reflow the main functional area.
- Place the pin control beside the brand title and icon, and hide it while only the narrow rail is visible.
- When the user unpins the sidebar, keep the full sidebar visible until the pointer leaves the sidebar area; only then collapse to the rail.
- Let users pin the sidebar again from the temporary overlay.
- Preserve keyboard access by keeping a focusable control in the collapsed rail.
- Do not persist the collapsed or expanded state across page refreshes.
- Keep the existing mobile grouped navigation behavior unchanged.

## Capabilities

### New Capabilities

### Modified Capabilities

- `grouped-tool-navigation`: Desktop grouped navigation gains a collapsible sidebar mode with a narrow trigger rail, pointer-triggered temporary overlay expansion, and keyboard-accessible expansion controls.

## Impact

- Affects the shell layout and desktop navigation rendering in `src/shell/App.tsx`.
- Affects global layout, sidebar, rail, overlay, and responsive styles in `src/styles.css`.
- Affects shell tests covering desktop navigation accessibility, layout state, and mobile behavior.
- No new runtime dependencies or backend APIs are expected.
