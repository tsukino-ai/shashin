# Admin Dashboard Implementation Plan

**Goal:** Build `/manage` page with list/grid views, batch selection, delete, and copy link.

**Architecture:** React components for interactive UI (toolbar, list, grid, modal), Astro page for SSR data fetching from R2.

---

### Task 1: Create `/manage` Astro page

**Files:**
- Create: `src/pages/manage.astro`

Fetch all images from R2 (both `public/` and `private/` prefixes), extract metadata, pass to React components.

### Task 2: Create `ManageToolbar.jsx`

**Files:**
- Create: `src/components/ManageToolbar.jsx`

Top bar with: stats (count, total size), view toggle (list/grid), category filter, sort selector, batch actions (select all, batch delete, copy links).

### Task 3: Create `PhotoList.jsx`

**Files:**
- Create: `src/components/PhotoList.jsx`

Table view: checkbox, thumbnail, filename, category badge, date, size, individual actions (copy, delete).

### Task 4: Create `PhotoGridManage.jsx`

**Files:**
- Create: `src/components/PhotoGridManage.jsx`

Masonry grid view: checkbox on each image, hover overlay with actions.

### Task 5: Create `DeleteConfirmModal.jsx`

**Files:**
- Create: `src/components/DeleteConfirmModal.jsx`

Confirm dialog for batch delete, shows "Delete X images?".

### Task 6: Build & deploy

**Run:** `npm run build`, verify no errors, push.
