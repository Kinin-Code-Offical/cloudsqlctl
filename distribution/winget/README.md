# Winget manifest template

Winget publishing requires submitting a PR to `microsoft/winget-pkgs`.

This folder contains a minimal manifest template you can adapt for the current version and submit upstream.

Typical update steps:

1. Update `PackageVersion` and `InstallerSha256` in `cloudsqlctl.yaml`.
2. Ensure the download URL points to the GitHub Release installer for that version.
3. Submit a PR to `https://github.com/microsoft/winget-pkgs`.

