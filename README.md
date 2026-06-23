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
