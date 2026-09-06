# Footballer Quest v0.1 — Android build

This package preserves the current game and adds an Android build path via Capacitor.

## GitHub Actions (no PC required)
1. Create a new GitHub repository.
2. Upload the CONTENTS of this folder to the repository root.
3. Open Actions -> Build Android APK -> Run workflow.
4. When the run finishes, open it and download the artifact `Footballer-Quest-v0.1-APK`.
5. Unzip the artifact on Android and install `Footballer-Quest-v0.1-debug.apk`.

Android may ask you to allow installation from your browser/files app.

Notes:
- Core gameplay and local saves run inside the APK.
- The existing global leaderboard backend is not bundled; with REACT_APP_BACKEND_URL empty, global leaderboard submission/loading may fail, while the game itself remains playable.
- Google Fonts in the current CSS are remote; if the phone is offline, fallback fonts may be used. This can be made fully offline in the next revision.
