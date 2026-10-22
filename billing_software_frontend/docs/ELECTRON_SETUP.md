# Cashio Smart Billing - Electron Desktop, Windows Installer & Auto-Update Guide

This guide provides technical specifications, development workflows, packaging procedures, and release guidelines for the **Cashio Smart Billing Desktop Application** (built with Electron, React, Vite, and electron-builder).

---

## 1. Prerequisites

Before developing or packaging the desktop application, ensure your environment has:

- **Node.js**: `v20.x` or higher (verified on `v24.13.0`)
- **npm**: `v10.x` or higher (verified on `11.6.2`)
- **Operating System**: Windows 10/11 (64-bit) for building the native Windows NSIS installer
- **Backend Services**:
  - Laravel backend running at `http://127.0.0.1:8000` (or your remote production URL configured via `VITE_API_URL`).
  - WhatsApp microservice at `http://localhost:3001` (if utilizing WhatsApp features).

---

## 2. Architecture & File Structure

The Electron integration is strictly additive and modular. Existing React components, calculations, routes, and styling remain 100% backward-compatible with standard web browser deployments.

```
billing_software_frontend/
├── build/
│   ├── icon.ico                     # Windows application icon
│   └── icon.png                     # 512x512 high-resolution icon (source for multi-resolution ICO)
├── dist/                            # Production web bundle compiled by Vite (relative base: ./)
├── electron/
│   ├── main.cjs                     # Electron main process (lifecycle, window config, auto-updater)
│   └── preload.cjs                  # ContextBridge preload script (secure IPC gateway)
├── release/                         # Output folder for Windows installers and update metadata
│   ├── Cashio Smart Billing Setup 1.0.0.exe          # Standalone Windows NSIS installer
│   ├── Cashio Smart Billing Setup 1.0.0.exe.blockmap # Differential download blockmap
│   ├── latest.yml                   # Auto-update metadata and SHA-512 hashes
│   └── win-unpacked/                # Staged unpacked application for immediate testing
├── src/
│   ├── components/common/
│   │   └── UpdateNotificationBanner.jsx # Non-intrusive in-app update notification
│   ├── routes/
│   │   └── AppRoutes.jsx            # Dual-mode router (HashRouter in Electron, BrowserRouter in Web)
│   └── services/
│       └── api.js                   # API configuration (supports file:// fallback to localhost:8000)
├── electron-builder.json            # Windows packaging and publishing configuration
└── package.json                     # Application version, scripts, and dependencies
```

---

## 3. Development Commands

All commands are executed inside `billing_software_frontend/`:

### Standard Web Development (Browser)
Keeps the existing web development workflow intact:
```bash
npm run dev
```
Launches the Vite dev server at `http://localhost:5173`.

### Desktop Application Development (Electron + Vite)
Launches Vite and Electron concurrently, waiting for the dev server to be ready:
```bash
npm run electron:dev
```

### Standalone Electron Launch
Launches Electron directly against an already running Vite dev server:
```bash
npm run electron
```

---

## 4. Windows EXE Installer Build

### Generate Production Web Bundle
Compiles the React frontend with relative asset paths into `dist/`:
```bash
npm run build
```

### Build Windows Installer (.exe)
Compiles the React app and produces the Windows installer in `release/`:
```bash
npm run dist
```

### Build Unpacked Directory (Fast Testing)
Generates `release/win-unpacked/` without compressing into an installer:
```bash
npm run dist:dir
```

### Installer Output Artifacts
After running `npm run dist`, the following files are produced in `release/`:
- **`Cashio Smart Billing Setup <version>.exe`**: The Windows NSIS installer.
- **`Cashio Smart Billing Setup <version>.exe.blockmap`**: Blockmap file enabling fast differential downloads during auto-updates.
- **`latest.yml`**: Auto-update manifest containing release version, SHA-512 checksums, and file sizes.

---

## 5. Version-Numbering Rules

Follow **Semantic Versioning** (`MAJOR.MINOR.PATCH`):

- **PATCH (`1.0.1`)**: Bug fixes, minor UI tweaks, or tax rate table updates.
- **MINOR (`1.1.0`)**: Backward-compatible new features (e.g. new report type, new invoice format).
- **MAJOR (`2.0.0`)**: Significant architectural upgrades or breaking workflow changes.

To bump the version before releasing:
```bash
# In billing_software_frontend/
npm version minor   # or patch / major
```

---

## 6. Auto-Update System & Release Provider

The desktop auto-update system is powered by `electron-updater` and GitHub Releases (or an HTTPS release server).

### Protection Against Disrupting Billing Work
Auto-updates are engineered with the following safety guardrails:
1. **Never update during active transactions**: The updater never reloads or restarts the application without explicit user consent.
2. **Background download**: Updates download silently in the background while cashiers continue working.
3. **User confirmation prompt**: Once downloaded, a non-intrusive in-app banner and dialog notify the user:
   > *"Cashio Smart Billing vX.Y.Z is downloaded and ready to install. Restart now to apply, or choose Later to finish current billing."*
4. **Disabled in development mode**: Auto-update checks are automatically disabled during local development (`!app.isPackaged`).

### Option A: GitHub Releases (Recommended)

1. Configure your repository in `billing_software_frontend/electron-builder.json`:
   ```json
   "publish": {
     "provider": "github",
     "owner": "YOUR_GITHUB_ORGANIZATION_OR_USERNAME",
     "repo": "YOUR_REPOSITORY_NAME",
     "releaseType": "release"
   }
   ```
2. Set your GitHub token in your environment:
   ```powershell
   $env:GH_TOKEN="ghp_your_github_personal_access_token"
   ```
3. Run the publishing build:
   ```bash
   npm run dist:publish
   ```
   This will build the installer and upload `Cashio Smart Billing Setup <version>.exe`, `*.blockmap`, and `latest.yml` directly as a draft release on GitHub.

### Option B: Private HTTPS Update Server

If you prefer self-hosting update files without GitHub:

1. Host an HTTPS directory on your server containing:
   - `latest.yml`
   - `Cashio Smart Billing Setup <version>.exe`
   - `Cashio Smart Billing Setup <version>.exe.blockmap`
2. Configure `UPDATE_FEED_URL` in `electron/main.cjs` or set the system environment variable:
   ```bash
   UPDATE_FEED_URL="https://updates.yourdomain.com/desktop"
   ```

---

## 7. Release & Deployment Workflow

Follow this step-by-step checklist when publishing a new version to clients:

1. **Implement and Test Changes**:
   Ensure all billing tests, invoice printings, and reports work normally in `npm run dev` and `npm run electron:dev`.
2. **Increment Version**:
   Update `"version"` in `billing_software_frontend/package.json` (e.g. from `1.0.0` to `1.0.1`).
3. **Build the Production Package**:
   ```bash
   npm run dist
   ```
4. **Publish Artifacts**:
   Upload `Cashio Smart Billing Setup <version>.exe`, `*.blockmap`, and `latest.yml` to your configured release host.
5. **Client Reception**:
   - Installed client applications will check for updates on startup.
   - If a newer version is found, `electron-updater` downloads it in the background.
   - Once downloaded, the cashier is presented with "Restart and Install" or "Later (Keep Billing)".
   - Clicking "Restart and Install" applies the update seamlessly without wiping local preferences or customer databases.

---

## 8. Rollback and Recovery Procedures

If a published version contains an unforeseen bug:

1. **Immediate Action**:
   - Delete or unpublish the faulty release from GitHub Releases (or remove `latest.yml` from your HTTPS update server).
   - This immediately halts new downloads for existing clients.
2. **Publish Rollback Patch**:
   - Revert the problematic code.
   - Bump the version to a higher patch version (e.g. from `1.0.1` to `1.0.2`).
   - Run `npm run dist` and publish `1.0.2`.
   - Existing clients on either `1.0.0` or `1.0.1` will detect `1.0.2` and update cleanly.
3. **Manual Reinstall**:
   - In case of an emergency, running any previous `Cashio Smart Billing Setup X.X.X.exe` installer will overwrite the desktop application binaries while preserving local cached authentication and settings.

---

## 9. Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `EPERM: operation not permitted, rename win-unpacked.tmp` | Windows Defender/indexer holds a temporary lock on extracted `.exe` files | Pre-configured retry fallback in `node_modules/app-builder-lib` automatically copies files via `fs.cp` if rename is blocked. |
| Blank screen on packaged launch | Router path mismatch on `file://` protocol | `AppRoutes.jsx` automatically uses `HashRouter` inside Electron, eliminating blank screen issues. |
| API calls fail inside desktop app | Missing base URL when `window.location.hostname` is empty in `file://` | `src/services/api.js` explicitly includes `window.location.protocol === "file:"` in localhost fallback. |
| Auto-update check fails with 404 | Missing `latest.yml` on release server | Ensure both the `.exe` installer and `latest.yml` are uploaded to the root of the update directory. |
