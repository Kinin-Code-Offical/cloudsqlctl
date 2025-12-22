# Distribution (Winget / Chocolatey / Scoop)

This project primarily distributes releases via GitHub Releases.

Additional package-manager distribution is optional and may require maintainers to publish to external registries.

## Scoop (bucket in this repo)

This repo includes a Scoop bucket manifest:
- `scoop/cloudsqlctl.json`

Install:

```powershell
scoop bucket add cloudsqlctl https://github.com/Kinin-Code-Offical/cloudsqlctl
scoop install cloudsqlctl/cloudsqlctl
```

## Chocolatey (package skeleton in this repo)

This repo includes a Chocolatey package skeleton under:
- `chocolatey/cloudsqlctl`

It is intended for maintainers to pack and publish (or for local/internal use).

## Winget (template)

Winget publishing is done via PRs to `microsoft/winget-pkgs`.

This repo includes a template manifest under:
- `distribution/winget/cloudsqlctl.yaml`

## Updating manifests

Use:

```powershell
powershell -ExecutionPolicy Bypass -File tools/update-distribution.ps1 -Version 0.4.15
```

