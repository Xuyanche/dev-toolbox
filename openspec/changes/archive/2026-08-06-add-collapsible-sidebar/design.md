## Context

The desktop shell is currently a two-column grid with a sticky 280px sidebar and a flexible main content column. The desktop navigation, mobile navigation, homepage, and tool mounting already share the same filtered tool registry; this change should preserve that model and avoid touching individual tool implementations.

Mobile viewports already hide the desktop sidebar and render a separate horizontal grouped navigation. The new collapse behavior is desktop-only.

## Goals / Non-Goals

**Goals:**

- Keep the expanded desktop sidebar visually and structurally close to the current experience.
- Let the main content use more horizontal space while the sidebar is collapsed.
- Provide a stable narrow rail that supports pointer discovery and keyboard access.
- Show the full navigation as an overlay in collapsed mode without resizing the main content.
- Keep state in React memory only; page refreshes can return to the default expanded state.
- Preserve existing single-expanded category behavior, current-tool state, and mobile navigation behavior.

**Non-Goals:**

- Persisting sidebar preference in local storage or server configuration.
- Adding routing, deep links, or browser history behavior.
- Changing the tool registry, tool ordering, or per-tool state model.
- Reworking mobile navigation into the same collapsible pattern.

## Decisions

### 1. Use a shell-level collapsed state

Add a `sidebarCollapsed` boolean in `App` and render a sidebar toggle that flips it. The state belongs in the shell because the behavior changes the layout around all tools, but it should not be part of the tool registry or individual tool state.

Alternative considered: CSS-only collapse via `:hover`. That would make pointer reveal easy but would not provide a reliable explicit expanded state or keyboard-accessible toggle.

### 2. Keep the narrow rail as part of the desktop sidebar

In collapsed mode the app shell should reserve only a small left column for the rail, while the full sidebar content is visually hidden until hover or focus interaction reveals it. The rail should contain an accessible control with a clear label such as "展开导航" / "收起导航" and should remain reachable in the tab order.

Alternative considered: hide the sidebar completely and reveal it from the viewport edge. That maximizes content width, but it removes an obvious keyboard entry point and makes pointer discovery harder.

### 3. Use overlay reveal for collapsed sidebar content

When collapsed, full navigation content should be positioned over the main content with a width matching the expanded sidebar. Pointer hover over the rail or expanded overlay keeps it visible. This satisfies the requirement that the main functional area does not resize while the user peeks at navigation.

Alternative considered: temporarily expand the grid column on hover. That would be simpler, but it would reflow wide tools and undermine the "遮挡就遮挡了" interaction model.

### 4. Leave mobile behavior untouched

The existing mobile breakpoint hides `.sidebar` and shows `.mobile-header` / `.mobile-nav`. The collapsed rail and overlay styles should only apply above the existing desktop/mobile breakpoint so mobile users continue to get the current horizontal navigation.

Alternative considered: adding the same rail on mobile. That would compete with the existing mobile nav and reduce the small-screen content width.

## Risks / Trade-offs

- [Overlay can cover active controls in the main workspace] -> This is expected in temporary reveal mode; keep the overlay width bounded to the expanded sidebar width and ensure it disappears when pointer leaves.
- [Keyboard users could tab into hidden navigation content] -> In collapsed mode, keep the rail control focusable and reveal the sidebar on focus-within, or otherwise ensure hidden full navigation is not confusingly unreachable/partially visible.
- [Existing shell tests rely on desktop nav always being present] -> Add tests for default expanded state and collapsed state without weakening current navigation ordering and accessibility assertions.
- [CSS hover behavior is not represented by jsdom layout] -> Cover state and class/attribute behavior in component tests, then verify final layout manually or with a browser screenshot during implementation.

## Migration Plan

No data migration is required. Implement behind the existing shell with default expanded state so current users see the same layout on first load. Rollback is limited to removing the shell state, sidebar toggle markup, and associated styles/tests.

## Design Update: Pin-Based Sidebar Control

The reviewed interaction should use a pin model rather than a drawer toggle. The pin control belongs inside the brand row, to the right of the brand icon and title, so it does not collide with the top-left title/icon. When the sidebar is collapsed to the narrow rail, the pin is hidden with the full sidebar content. Entering the rail reveals the full sidebar overlay, including the pin.

The shell should model three visible states:

- Pinned: the sidebar is fixed in the layout and the main content starts after the full sidebar width.
- Unpinned but still open: after the user clicks the pinned icon to unpin, the sidebar remains visibly open until the pointer leaves the sidebar area.
- Collapsed/preview: after pointer exit, the rail remains and the main content expands; pointer entry reveals the full sidebar as an overlay without resizing the main content.

Clicking the pin while the sidebar is temporarily previewed pins it again and restores the fixed desktop layout.
