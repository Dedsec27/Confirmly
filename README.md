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


## v24
- Deleting a booking from View booking now immediately refreshes the active Reminder Queue tab.
- Sent/Ready counts, booking table, dashboard metrics, and queue cards now stay in sync without manual refresh.
- Updated PWA cache version.


## v25
- Updated Starter plan price to €9/month.
- Updated Pro plan price to €14/month.


## v26
- Added the business name to the top header, centered in the middle of the top bar.
- The header label updates automatically when the business name is changed in Settings.
- Updated the service worker cache version.


## v27
- Renamed Reminder copy to Reminder flow.
- Added editable first reminder, follow-up reminder, and missed-booking recovery steps.
- Each step can be enabled/disabled, renamed, and given a custom timing. Reminder messages remain editable.
- Reminder Queue flow summary now mirrors saved flow settings.
- Updated PWA cache version.


## v28
- Removed the duplicate Settings heading inside the Settings page.
- Enlarged the “Make Confirmly sound like your business.” description for clearer hierarchy.
- Updated PWA cache version.


## v29
- Hides the top "Send all ready" and "New appointment" buttons while the Settings view is open.
- Added a desktop sidebar collapse/expand button inside the sidebar brand area.
- Sidebar state is saved locally and restored on refresh.
- Updated the service worker cache version.


## v30
- Cleaned up the collapsed sidebar layout.
- Sidebar now shows icon-only navigation with hover tooltips.
- Hides the bulky trial card when collapsed and keeps a cleaner bottom account area.
- Improved spacing, centering, and collapse button styling.


## v31
- Removed the duplicate top "Send all ready" button from Reminder Queue.
- Kept the in-page Reminder Queue action as the single send-all control.
- Updated the PWA cache version.


## v32
- New workspaces now start with zero bookings.
- Removes only the old built-in sample bookings (Sofia, Nikos, Maria, Eleni, Iris, Dimitris, and Anna) once.
- User-created bookings are preserved.
- Updated PWA cache version.


## v36
- Fixed two missing optional onboarding controls that could throw a browser runtime error during startup.
- App now continues loading cleanly whether the onboarding UI is included or not.
- Updated PWA cache version.
