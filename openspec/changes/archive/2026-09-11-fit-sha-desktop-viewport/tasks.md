## 1. SHA Focus State and Structure

- [x] 1.1 Add a SHA-specific shell focus state that is active only while SHA is selected and required browser capabilities are available, without changing the existing focus-tool set.
- [x] 1.2 Refactor only the SHA branch of `HashTool` into explicit control and result workspace regions while preserving MD5 markup and all hash operations.
- [x] 1.3 Make populated SHA digest outputs keyboard-focusable for internal horizontal navigation without changing copied values or empty-state behavior.

## 2. Desktop Single-Viewport Layout

- [x] 2.1 Add a SHA-only 1280×768 desktop media block that constrains the shell, main content, active section, SHA page, and in-flow footer to the dynamic viewport height.
- [x] 2.2 Implement the SHA left control column and right result column with a shrinkable height chain, internally scrolling input, stable action feedback, and no complete-workspace vertical overflow.
- [x] 2.3 Keep the four SHA algorithm panels in their fixed vertical order, compact their SHA-only spacing, and make long digest fields single-line horizontal scrollers with fixed copy controls.
- [x] 2.4 Confirm low-height, narrow, zoomed, and global-warning layouts retain natural document flow and that MD5 receives no SHA focus or density styles.

## 3. Regression and Browser Verification

- [x] 3.1 Extend shell tests for SHA focus activation, removal after navigating to MD5 or home, and suppression when global capability warnings are present.
- [x] 3.2 Extend hash component tests for the SHA workspace regions, algorithm order, focusable long outputs, complete copying, stable feedback, and unchanged MD5 structure and behavior.
- [x] 3.3 In a real browser, verify the empty and calculated SHA page have no document, main-section, or complete-workspace vertical overflow at 1280×768 and 1440×900.
- [x] 3.4 In a real browser, verify long input scrolls internally, SHA-384 and SHA-512 outputs scroll horizontally and remain fully copyable, and document scrolling returns at low-height and narrow viewports.

## 4. Final Validation

- [x] 4.1 Run the affected shell and hash tests, then run the full test suite.
- [x] 4.2 Run type checking, linting, and the production build.
- [x] 4.3 Review the final diff for scope, confirm no MD5 or unrelated layout regressions, and run `openspec validate fit-sha-desktop-viewport --strict`.
