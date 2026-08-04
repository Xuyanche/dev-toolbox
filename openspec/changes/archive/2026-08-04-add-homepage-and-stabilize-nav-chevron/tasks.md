## 1. Introduction homepage

- [x] 1.1 Create a semantic, local-only homepage component with the toolbox introduction, six category summaries and privacy messaging.
- [x] 1.2 Add responsive homepage styles using the existing visual tokens so the introduction remains readable without horizontal page scrolling at desktop and narrow widths.
- [x] 1.3 Add component tests for the homepage content, all six category summaries, local-processing message and narrow-viewport availability.

## 2. Shell and brand integration

- [x] 2.1 Extend the shell activity model to represent the homepage with no active tool, initialize both the active tool and expanded desktop group to empty, and keep every tool component mounted for session-state retention.
- [x] 2.2 Convert the desktop and mobile brand regions into native, consistently named homepage buttons that clear the active tool and collapse desktop categories when activated.
- [x] 2.3 Update shell tests for the homepage default, absence of current-tool state, tool selection from home, pointer and keyboard brand activation, mobile brand access and tool-state preservation across a homepage round trip.

## 3. Stable category chevrons

- [x] 3.1 Replace the font chevron with a symmetric fixed-viewBox SVG inside a fixed square alignment box, using an explicit center transform origin and transform-only transition.
- [x] 3.2 Refine the category-button layout so title text and chevrons share a stable visual center in both states without changing the single-expanded disclosure behavior.
- [x] 3.3 Add navigation tests confirming every category uses the stable chevron structure and that expanding/collapsing preserves the same arrow node while only changing disclosure state.

## 4. Verification

- [x] 4.1 Run the full unit/component suite and resolve regressions caused by the new default page and changed keyboard focus order.
- [x] 4.2 Run TypeScript type checking, ESLint, the production build and strict OpenSpec validation successfully.
- [x] 4.3 Manually verify the homepage and brand interaction at desktop and narrow widths, plus category title/chevron alignment and zero visual movement through repeated expand/collapse cycles.
