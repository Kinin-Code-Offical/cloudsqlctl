<!-- markdownlint-disable MD024 -->

# Changelog

## [0.4.12] - 2025-12-21

### Changed

- new release with minimal changes

## [0.4.11] - 2025-12-21

### Changed

- new release with minimal changes

## [0.4.10] - 2025-12-21

### Changed

- new release with minimal changes
- remove temporary test file

## [0.4.9] - 2025-12-21

### Changed

- new release with minimal changes

## [0.4.8] - 2025-12-21

### Changed

- new release with minimal changes

## [0.4.7] - 2025-12-21

### Changed

- new release with minimal changes
- remove trailing whitespace in commands documentation
- sanitize user-specific paths in command output and update documentation
- remove trailing whitespace in commands documentation

## [0.4.6] - 2025-12-21

### Changed

- new release with minimal changes
- rename setup scripts for consistency in package.json
- enhance documentation generation and update changelog entry creation

## [0.4.5] - 2025-12-21

### Added

- Release 0.4.5

## [0.4.3] - 2025-12-21

### Added

- Release 0.4.3

## [0.4.2] - 2025-12-21

### Added

- Release 0.4.2

## [0.4.1] - 2025-12-21

### Added

- Release 0.4.1

## [0.3.56] - 2025-12-21

### Added

- Release 0.3.56

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
