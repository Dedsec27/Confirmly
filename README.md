# Confirmly – Settings Persistence Fix v15

Fixes the default "Send all" channel reverting after refresh.

- The selected default is now stored in a dedicated browser-storage key as well as the app state.
- Existing saved settings are hydrated from the saved preference on every launch.
- Legacy WhatsApp defaults migrate to Email only when the user has not already saved a choice.
- Service-worker cache version bumped so installed iOS/Android builds can receive the update.

Upload all files in this folder, including `api/` and `icons/`, to the repository root and commit.
