# Confirmly — Account menu & plan selector (v17)

Upload the contents of this folder to the root of your GitHub Confirmly repository and commit.

## Included fixes

- The three-dot account button now opens an in-app workspace menu.
- Workspace settings opens the Settings screen and focuses the business-name field.
- Plan & billing opens the in-app plan selector.
- Install Confirmly uses the existing install prompt or shows the browser install instruction.
- Upgrade plan now opens the same plan selector.
- Starter and Pro choices update the visible workspace plan and persist in browser storage.
- Updated service worker cache version so installed PWA versions receive the update.

## Note

This is still a prototype plan selector. Selecting Starter or Pro does not charge a card because a Stripe/Lemon Squeezy checkout has not been connected yet.


## v18 — Delete all bookings
- Added an in-app **Delete all** control in Bookings.
- Uses a confirmation modal, never a browser dialog.
- Deletes all booking statuses immediately and refreshes dashboard, queue, and booking list.

## v19
- Removed the duplicate top-bar refresh control. The Appointments toolbar refresh button remains the single booking refresh action.

## v20 – Live email status spacing
- Added clear vertical spacing between the “Live email is configured” status card and the “Check again” button.


## v21
- Added a dark mode option in Settings.
- The selected theme is saved locally and restored on reload.
- Service worker cache bumped so installed apps receive the update.


## v22
- Refined dark mode into a monochrome black-and-white theme.
- Removed green accent styling while dark mode is active.
- Updated the confirmation ring to render in white/gray in dark mode.


## v23
- Fixed booking action modal buttons by attaching direct click handlers every time the modal is opened.
- Edit, confirm, reschedule, no-show, re-queue, cancel, and delete now work from View booking.
- Updated PWA cache so the fix reaches installed apps.
