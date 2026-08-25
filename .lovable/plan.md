# Consolidate the app into work hubs (fewer pages, fewer clicks)

## The argument

Right now the sidebar exposes 23 destinations. That is the classic ERP mistake: navigation mirrors the *database* (one page per table) instead of mirroring the *job* the user is doing. Materials alone is four pages — Materials, Material Purchases, Material Stock Ledger, BOM Management — but the actual task is one: "manage my raw material stock." Every context switch loses filters, loses the selected record, and re-fetches data.

The ERP fix is not deleting features; it is **hub pages with tabs plus a persistent context** — the record you selected stays selected as you move between tabs (SAP calls it a work centre, NetSuite a centre tab). Same screens, one third of the navigation, and no lost state.

Target: **23 sidebar links to 9**, no feature removed, all existing URLs still work.

## New navigation

```text
Overview        Dashboard              /dashboard
                Command Center        /command-center    (admin)

Daily Work      Today's Work          /work        [Follow-ups | Collections | Dispatch | Delivery Calendar]
                Sales                 /sales       [Orders | Quotes | Intelligence]
                Customers             /customers

Supply          Purchasing            /purchasing  [Purchase Orders | Reorder & Dead Stock | Suppliers | Supplier Ledger]
                Inventory             /inventory   [Stock | Intelligence | Stock Ledger]
                Materials             /materials   [Materials | Purchases | Stock Ledger | BOM]

Money & Admin   Finance               /finance     [Payments | Bank Book | Reports]
                Settings              /settings    (Help moves into Settings tabs + header "?" link)
```

The "Operations" collapsible group disappears — its contents live inside Inventory and Materials.

## What changes for the user

- Selecting a material and checking its purchases, ledger and BOM: 4 navigations becomes 0 (tabs inside the same page, selected material preserved).
- Chasing money in the morning: Follow-ups to Collections to Dispatch without leaving the page.
- Deep links keep working — `/material-purchases` redirects to `/materials?tab=purchases`, so bookmarks, the AI assistant and any in-app links do not break.
- Tab state lives in the URL (`?tab=`), so refresh and back-button behave correctly.

## Technical approach

1. **Shared hub shell** — new `src/components/layout/HubPage.tsx`: title, optional right-side actions, and a URL-synced tab bar (`useSearchParams`), scrollable on mobile so tabs never wrap.
2. **Hub pages** — `src/pages/hubs/{WorkHub,PurchasingHub,InventoryHub,MaterialsHub,FinanceHub}.tsx`. Each renders the *existing* page components as tab panels. No business logic, hooks or queries are touched; existing pages are refactored only to drop their own outer page heading where it would duplicate the hub header.
3. **Lazy loading** — tab panels loaded with `React.lazy` + `Suspense` so a hub doesn't pay for tabs the user never opens.
4. **Shared selection context** — `MaterialsHub` holds the selected material id (and `InventoryHub` the selected item id) so tabs stay in sync; passed down as props to the existing panels.
5. **Routing** — `src/App.tsx`: hub routes added, all old paths kept as `<Navigate replace to="/hub?tab=x">`.
6. **Sidebar** — `src/components/AppSidebar.tsx` rewritten to the 4 groups / 9 links above, active state matched by hub prefix rather than exact path.
7. **Sub-nav preserved** — pages that already have internal tabs (Sales orders/quotes, Customer profile) nest under the hub tab rather than gaining a second tab row.

## Rollout

Phase 1: hub shell + Materials hub (biggest win, 4 pages to 1).
Phase 2: Inventory and Purchasing hubs.
Phase 3: Daily Work and Finance hubs, then sidebar reduction and redirects.

Each phase is independently shippable; navigation stays usable throughout.
