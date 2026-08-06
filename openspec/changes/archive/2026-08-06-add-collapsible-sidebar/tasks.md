## 1. Shell State And Markup

- [x] 1.1 Add a shell-level `sidebarCollapsed` state in `App` with default expanded behavior and no persistence.
- [x] 1.2 Add accessible sidebar toggle controls for expanded and collapsed rail states with correct labels and pressed/expanded state.
- [x] 1.3 Preserve existing grouped navigation rendering, single-expanded category behavior, active tool state, and homepage return behavior while adding collapse support.

## 2. Desktop Layout And Interaction Styles

- [x] 2.1 Update desktop shell styles so expanded mode keeps the current sidebar plus main-content layout.
- [x] 2.2 Add collapsed desktop rail styles that reserve only a narrow left column and let the main content expand.
- [x] 2.3 Add collapsed hover and focus-within overlay styles that reveal the full sidebar above the main content without changing main-content width.
- [x] 2.4 Keep the existing mobile breakpoint behavior unchanged so the desktop rail and overlay do not appear on mobile.

## 3. Verification

- [x] 3.1 Update shell tests to cover default expanded state, collapsing to the rail, expanding from the rail, and continued grouped navigation accessibility.
- [x] 3.2 Add or update tests confirming mobile navigation remains available and unaffected by the desktop collapse behavior.
- [x] 3.3 Run typecheck, lint, and test commands; manually verify the desktop collapsed overlay interaction in a browser if available.

## 4. Pin Interaction Refinement

- [x] 4.1 Replace the top-corner sidebar toggle with a pin control placed in the brand row.
- [x] 4.2 Update sidebar state so unpinning keeps the sidebar open until pointer exit, then collapses to the rail.
- [x] 4.3 Update styles and tests for pinned, unpinned-open, collapsed rail, and overlay preview states.
- [x] 4.4 Re-run automated checks and browser-verify the pin interaction.
