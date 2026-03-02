<!-- markdownlint-disable MD024 -->

# Changelog

## [0.5.3] - 2026-03-02

### Added

- Release 0.5.3

## [0.5.2] - 2026-03-02

### Changed

- Implement feature X to enhance user experience and fix bug Y in module Z

## [0.5.1] - 2026-03-02

### Changed

- bump @types/node from 25.0.3 to 25.1.0 (#55)
- bump commander from 14.0.2 to 14.0.3 (#57)
- bump prettier from 3.7.4 to 3.8.1 (#58)
- bump axios in the npm_and_yarn group across 1 directory (#60)
- bump inquirer from 13.1.0 to 13.2.2 (#59)
- bump commander from 12.1.0 to 14.0.2 (#49)
- bump inquirer from 9.3.8 to 13.1.0 (#50)
- bump @types/extract-zip from 2.0.0 to 2.0.3 (#52)
- bump typescript-eslint from 8.50.0 to 8.51.0 (#53)
- bump globals from 16.5.0 to 17.0.0 (#54)
- update commands reference for v0.5.0

## [0.5.0] - 2025-12-22

### Added

- support bundle command (`cloudsqlctl support`)
- upgrade channels/pinning/target version (`cloudsqlctl upgrade --channel/--pin/--version`)
- npm publish pipeline and package files whitelist
- distribution templates: Scoop bucket, Chocolatey skeleton, Winget template
- enterprise policy.json guardrails for update/auth

### Changed

- deterministic proxy checksum verification from GCS `.sha256`
- safer portable upgrade swap (temp + atomic replace + rollback)
- service-aware proxy install/update coordination
- GitHub Release workflow supports workflow_dispatch + republish (asset delete/replace)
- ProgramData machine-scope ACL hardening (no Users write for service binaries)
- repo hygiene: ignore build artifacts

## [0.4.17] - 2025-12-22

### Changed

- include zip checksum in SHA256SUMS.txt

## [0.4.16] - 2025-12-22

### Changed

- add optional signing hooks to release workflow (skips if secrets not set)
- add Scoop bucket + Chocolatey skeleton + Winget manifest template
- add enterprise policy.json guardrails for upgrade/auth
- make proxy install/update service-aware and use safe temp download + swap

## [0.4.15] - 2025-12-22

### Changed

- add support bundle command and docs updates
- add upgrade channels, pinning, and GitHub API hardening
- enforce deterministic proxy checksum verification and safer portable swap
- add npm publish workflow and package contents whitelist

## [0.4.14] - 2025-12-21

### Changed

- tighten ProgramData bin ACLs for system installs
- add manual release workflow dispatch with tag input
- delete existing release assets on same-tag reruns
- enforce admin/elevation guardrails for system-scope upgrades
- ignore artifacts output in .gitignore

## [0.4.13] - 2025-12-21

### Changed

- new release with minimal changes
- Potential fix for code scanning alert no. 3: Uncontrolled command line (#8)
- new release with minimal changes

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
