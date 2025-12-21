# Changelog

## [0.2.0] - 2025-12-21

### Added

- **Windows Installer**: Added Inno Setup script (`installer/cloudsqlctl.iss`) and build tool (`tools/build-installer.ps1`) to generate `cloudsqlctl-setup.exe`.
- **Path Resolution**: Implemented dynamic path resolution in `src/system/paths.ts` to respect environment variables (`CLOUDSQLCTL_HOME`, `CLOUDSQLCTL_LOGS`, etc.).
- **Installer Script**: Added `npm run installer` script to package.json.

### Changed

- **Node Version**: Updated project requirement to Node.js >=22.0.0 in `package.json` and CI/CD workflows.
- **CI/CD**:
  - Updated GitHub Actions (`ci.yml`, `release.yml`) to use Node 22.x.
  - Fixed YAML indentation in `codeql.yml`.
  - Updated Release workflow to build and upload the Windows installer.
- **System Paths**: Fixed `SYSTEM_PATHS.PROXY_EXE` to correctly point to `bin/cloud-sql-proxy.exe` in ProgramData.
- **Updater**: Refactored `downloadProxy` to accept a target path, enabling flexible installation for User/Machine scopes.
- **Check Command**: Updated `cloudsqlctl check` to use resolved paths instead of hardcoded system paths.

### Fixed

- **Path Consistency**: Ensured consistent path usage across CLI commands, system scripts (`ps1.ts`), and updater logic.
