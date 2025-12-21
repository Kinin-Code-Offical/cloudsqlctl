<!-- markdownlint-disable MD024 -->

# Changelog

## [0.3.0] - 2025-12-21

### Added

- **Setup Wizard**: New `setup` command for interactive initialization.
- **Authentication**: New `auth` command suite (`login`, `adc`, `status`, `set-service-account`).
- **Service Account Support**: Securely manage service account keys with ACL hardening.
- **Windows Service**: Enhanced `service` command with `install` and `configure` options for instance/port.
- **Installer**: Improved Inno Setup script with smart binary reuse and permission management.
- **Diagnostics**: Expanded `doctor` command to check ADC, network connectivity, and service credentials.

### Changed

- **Proxy**: `startProxy` now respects `GOOGLE_APPLICATION_CREDENTIALS` from environment or config.
- **Logging**: Credential paths are now masked in logs.
- **CLI**: Version is now dynamically read from `package.json`.
- **Release**: Added SHA256 checksum generation to release workflow.

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
