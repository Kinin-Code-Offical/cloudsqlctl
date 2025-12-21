# Installation Guide

## Prerequisites

- **Operating System**: Windows 10/11 or Windows Server 2016+ (x64)
- **PowerShell**: Version 5.1 or later
- **Google Cloud CLI**: The `gcloud` CLI must be installed and available in your PATH. (The tool can help you install this if missing).

## Installation Methods

### Option 1: Installer (Recommended)

1.  Go to the [Releases](https://github.com/Kinin-Code-Offical/cloudsqlctl/releases) page.
2.  Download the latest `cloudsqlctl-setup.exe`.
3.  Run the installer and follow the on-screen instructions.
4.  The installer will automatically add `cloudsqlctl` to your system PATH.

### Option 2: Standalone Binary

1.  Go to the [Releases](https://github.com/Kinin-Code-Offical/cloudsqlctl/releases) page.
2.  Download `cloudsqlctl.exe`.
3.  Place it in a folder of your choice (e.g., `C:\Tools\cloudsqlctl`).
4.  Add that folder to your system PATH environment variable.

## Verification

Open a new PowerShell terminal and run:

```powershell
cloudsqlctl --version
```

You should see the version number output.

## Next Steps

Once installed, proceed to the [Configuration & Setup](Configuration.md) guide to initialize the tool.
