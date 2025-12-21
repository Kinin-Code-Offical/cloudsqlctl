## [0.3.56] - 2025-12-21

### Added
- Release 0.3.56

# Changelog

## [0.3.5] - 2025-12-21

### Added

- Release 0.3.5

## [0.3.2] - 2025-12-21

### Added

- Release 0.3.2

## [0.3.1] - 2025-12-21

### Added

- Release 0.3.1

## [0.3.0] - 2025-12-21

### Added

- **Setup Wizard**: New `setup` command for interactive initialization.
- **Auth Management**: New `auth` command for handling gcloud login, ADC, and Service Accounts.
- **Paths Command**: New `paths` command to display system paths and configuration sources.
- **Artifact Staging**: Standardized build artifacts (`artifacts/`) with SHA256 checksums.
- **Versioning**: Single source of truth for versioning via `package.json`.

### Changed

- **Installer**: Updated Inno Setup script to support dynamic versioning and smarter binary reuse.
- **CI/CD**: Upgraded GitHub Actions to v4, fixed release workflow, and added artifact verification.
- **Service Management**: Improved Windows Service handling with argument support and ACL hardening.
- **Documentation**: Updated README with correct paths and new commands.

### Fixed

- **Build**: Resolved duplicate exports in service module.
- **Types**: Fixed TypeScript errors in self-heal and service commands.
- **Linting**: Corrected Markdown formatting issues.

