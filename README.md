# CloudSQLCTL

**cloudsqlctl** is a Windows-native command-line tool designed to simplify the management of the Google Cloud SQL Auth Proxy. It integrates seamlessly with the `gcloud` CLI to provide a robust, production-ready experience for developers working on Windows.

## Features

- **Setup Wizard**: Interactive `setup` command to get everything running in minutes.
- **Authentication Management**: Built-in `auth` command for gcloud login, ADC setup, and Service Account management.
- **Automated Installation**: Downloads and verifies the official Cloud SQL Proxy binary.
- **Instance Management**: Lists and selects Cloud SQL instances using your active `gcloud` configuration.
- **Process Management**: Starts, stops, and restarts the proxy as a background process or Windows Service.
- **Structured Logging**: JSON logging with automatic masking of sensitive tokens.
- **Diagnostics**: Built-in `doctor` command to check environment health (gcloud, ADC, network, service).
- **Self-Update**: Easily update the proxy binary to the latest version.

## Installation

Download the latest installer (`cloudsqlctl-setup.exe`) from the [Releases](https://github.com/Kinin-Code-Offical/cloudsqlctl/releases) page.

## Quick Start

Run the setup wizard to configure gcloud, authentication, and the proxy:

```powershell
cloudsqlctl setup
```

## Usage

```powershell
cloudsqlctl [command] [options]
```

For a complete reference of all commands and options, see the [Command Reference](docs/commands.md).

### Commands

| Command   | Description                                              |
| :-------- | :------------------------------------------------------- |
| `setup`   | Interactive setup wizard (Recommended for first run).    |
| `auth`    | Manage authentication (Login, ADC, Service Accounts).    |
| `install` | Download and install the Cloud SQL Proxy binary.         |
| `update`  | Update the Cloud SQL Proxy binary to the latest version. |
| `list`    | List available Cloud SQL instances.                      |
| `select`  | Interactively select a Cloud SQL instance to proxy.      |
| `connect` | Connect to a specific instance directly.                 |
| `start`   | Start the proxy for the selected instance.               |
| `stop`    | Stop the running proxy process.                          |
| `service` | Manage Windows Service (Admin required).                 |
| `env`     | Manage environment variables (User/Machine scope).       |
| `gcloud`  | Manage Google Cloud CLI (install portable version).      |
| `status`  | Check if the proxy is running and view details.          |
| `logs`    | View the tail of the proxy logs.                         |
| `doctor`  | Run diagnostics to verify environment setup.             |
| `reset`   | Reset configuration and remove local files.              |

### Authentication Modes

**1. Developer Mode (Interactive)**
Uses your personal Google Cloud credentials via `gcloud`.

```powershell
cloudsqlctl auth login
cloudsqlctl auth adc
```

**2. Machine/Service Mode (Service Account)**
Uses a Service Account JSON key. Ideal for automated environments or Windows Services.

```powershell
# Securely install service account key (Machine scope requires Admin)
cloudsqlctl auth set-service-account --file "C:\path\to\key.json" --scope Machine
```

### Windows Service

Run the proxy as a Windows Service for background persistence.

```powershell
# Install service (Admin required)
cloudsqlctl service install --instance "my-project:region:instance" --port 5432

# Start service
cloudsqlctl service start

# 2. Select your database instance
cloudsqlctl select

# Or list and connect directly
cloudsqlctl list
cloudsqlctl connect project:region:instance

# 3. Start the proxy (if using select)
cloudsqlctl start

# 4. Check status
cloudsqlctl status
```

## Configuration

Configuration and logs are stored in:

- **User Scope (Default)**:
  - Config: `%LOCALAPPDATA%\CloudSQLCTL`
  - Logs: `%LOCALAPPDATA%\CloudSQLCTL\logs`
  - Binary: `%LOCALAPPDATA%\CloudSQLCTL\bin`

- **Machine Scope (Service)**:
  - Config: `%ProgramData%\CloudSQLCTL`
  - Logs: `%ProgramData%\CloudSQLCTL\logs`
  - Binary: `%ProgramData%\CloudSQLCTL\bin`

**Path Resolution Logic:**

1. Environment Variables (`CLOUDSQLCTL_HOME`, etc.)
2. Existing System Installation (`%ProgramData%`)
3. Existing User Installation (`%LOCALAPPDATA%`)
4. Default: User Scope (`%LOCALAPPDATA%`)

Verify current paths with:

```powershell
cloudsqlctl paths
```

## Release

This project uses GitHub Actions for automated releases.

1. Tag a new version: `git tag v0.3.0`
2. Push the tag: `git push origin v0.3.0`
3. The workflow will build, test, sign (if configured), and publish artifacts to the [Releases](https://github.com/Kinin-Code-Offical/cloudsqlctl/releases) page.

## Troubleshooting

If you encounter issues:

1. Run `cloudsqlctl doctor` to check for common problems.
2. Check the logs in `%LOCALAPPDATA%\CloudSQLCTL\logs`.
3. Ensure `gcloud` is installed and authenticated (`gcloud auth login`).

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Development

### Prerequisites

- Node.js 22 (LTS)
- PowerShell 5.1 or later

### Build

To build the project and generate the single executable:

```powershell
# Install dependencies
npm install

# Build the source code (TypeScript -> CJS)
npm run build

# Package into a single executable (SEA)
npm run package
```

The executable will be generated at `bin/cloudsqlctl.exe`.

## License

MIT
