# Cockpit Shell

**Route**: All routes (wraps every page)  
**File**: `src/frontend/src/pages/CockpitShell.tsx`  
**Type**: Persistent layout shell

## Purpose

CockpitShell is the outer container that wraps every screen in P1. It provides the left sidebar navigation, the top header bar, the page outlet, and all routing context. Every page the user visits renders inside CockpitShell.

## User Flow

```
User authenticates
→ CockpitShell mounts
→ Sidebar shows primary nav items
→ Header shows current route title + user score
→ User clicks nav item → React Router navigates
→ Page content loads in main area
→ User scrolls main area (sidebar stays fixed)
```

## Inputs

- `useLocation()` — determines which nav item is active
- `useNavigate()` — powers all sidebar nav clicks
- Child routes via `<Outlet />` (React Router)

## Outputs

- Persistent sidebar with nav items
- Top header bar
- Page content area (`flex-1 overflow-y-auto`)

## Navigation Structure

**Primary nav** (main sidebar items):
- Today (`/today`)
- Goals (`/goals`)
- Vision (`/vision`)
- Cycle (`/cycle`, also active for `/cycles`)
- Chat (`/chat`)
- Feed (`/feed`)

**Footer nav** (small sidebar footer):
- My Proofs (`/proof`)
- Admin / Proof Integrity (`/admin`) — Shield icon, indigo accent

## Agent Logic

No direct agent output in CockpitShell. The sidebar footer "Admin / Proof Integrity" link uses a Shield icon to signal the integrity monitoring function.

## Proof Integration

The "My Proofs" footer link navigates to `/proof` (ProofPage). The "Admin / Proof Integrity" link navigates to `/admin` (AdminPage).

## Cycle Integration

The "Cycle" primary nav item activates when `pathname.startsWith("/cycle") || pathname === "/cycles"` — covering the dashboard, weekly planning, mid-review, end-review, and archive routes.

## Vision Integration

The "Vision" primary nav item navigates to `/vision`.

## Notes for Engineers

- `SidebarPrimaryItem` is a local component inside CockpitShell — not exported
- Active state uses `useLocation().pathname` — check `pathname.startsWith()` for routes with sub-paths
- Single scrollbar rule: sidebar is `overflow-hidden`, only the `<main>` area scrolls
- Do not add `overflow-y-auto` to the sidebar or its parent

## Notes for Designers

- The sidebar should show a subtle active indicator (indigo left border or background) on the current route
- Footer nav items should be visually distinct from primary nav items (smaller, muted)
- On mobile: sidebar collapses to a bottom tab bar or hamburger drawer
- The header should show the current page title dynamically based on route
