## 1. Activity-scoped focus mode

- [x] 1.1 Update the application shell to expose a JSON focus-mode class only while JSON is active and no global capability warning is displayed.
- [x] 1.2 Add desktop width-and-height media rules that constrain the JSON application shell to `100dvh` and establish a shrinkable flex height chain through the active section and JSON tool page.
- [x] 1.3 Make the JSON workspace consume remaining height, retain independent input/tree scrolling, and compact the in-flow footer without changing its content.
- [x] 1.4 Confirm narrow, low-height, zoomed, and global-warning layouts do not receive the outer overflow lock and retain accessible document scrolling.

## 2. Regression coverage

- [x] 2.1 Extend application shell tests to verify focus-mode activation for JSON, removal after navigating away, and suppression when a global capability warning is present.
- [x] 2.2 Extend JSON layout regression checks to cover the shrinkable workspace hooks and preserve all existing operations, feedback, and internal scrolling structure.
- [x] 2.3 In a built browser page, verify no document-level vertical overflow at 1280×768 and 1440×900, verify long input and deep tree content scroll independently, and verify document scrolling returns at narrow and low-height viewports.

## 3. Verification

- [x] 3.1 Run the relevant application shell and JSON tests, then run the full test suite.
- [x] 3.2 Run type checking, linting, and the production build.
- [x] 3.3 Review the final diff for scope and run `openspec validate lock-json-desktop-viewport --strict`.

## 4. Expand focus mode to the selected tool groups

- [x] 4.1 Replace the JSON-only focus predicate with an explicit eligible-tool set covering AES, DES, SM4, URL, Unicode, Base64, JWT, and JSON while retaining global-warning suppression.
- [x] 4.2 Generalize the desktop viewport height chain and active-section overflow fallback without changing homepage or non-target tool layouts.
- [x] 4.3 Add shrinkable workspace adapters for symmetric encryption, text encoding, and both JWT modes while preserving JSON input/tree scrolling and the compact in-flow footer.
- [x] 4.4 Verify tool-specific notices remain accessible in focus mode and narrow, low-height, zoomed, or global-warning layouts retain natural document scrolling.

## 5. Expanded regression coverage

- [x] 5.1 Extend shell tests to cover focus activation for every eligible tool, removal for homepage and non-target tools, runtime-enabled DES, and suppression during global capability warnings.
- [x] 5.2 Extend symmetric encryption, text encoding, JWT, and JSON layout tests to cover their focus-mode workspace hooks without changing functional behavior.
- [x] 5.3 In a built browser page, verify all eight target pages have no document-level vertical overflow at 1280×768 and 1440×900, long functional content scrolls internally, and document scrolling returns outside focus conditions.

## 6. Expanded verification

- [x] 6.1 Run the affected shell and tool tests, then run the full test suite.
- [x] 6.2 Run type checking, linting, and the production build.
- [x] 6.3 Review the expanded diff for scope and run `openspec validate lock-json-desktop-viewport --strict`.
