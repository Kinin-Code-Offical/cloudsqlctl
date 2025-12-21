# CloudSQLCTL

**cloudsqlctl** is a Windows-native command-line tool designed to simplify the management of the Google Cloud SQL Auth Proxy. It integrates seamlessly with the `gcloud` CLI to provide a robust, production-ready experience for developers working on Windows.

## Features

- **Automated Installation**: Downloads and verifies the official Cloud SQL Proxy binary.
- **Instance Management**: Lists and selects Cloud SQL instances using your active `gcloud` configuration.
- **Process Management**: Starts, stops, and restarts the proxy as a background process with PID tracking.
- **Structured Logging**: JSON logging with automatic masking of sensitive tokens, stored in `%LOCALAPPDATA%`.
- **Diagnostics**: Built-in `doctor` command to check environment health (gcloud, ADC, network).
- **Self-Update**: Easily update the proxy binary to the latest version.

## Installation

Download the latest `cloudsqlctl.exe` from the [Releases](https://github.com/your-org/cloudsqlctl/releases) page and add it to your PATH.

## Usage

```powershell
cloudsqlctl [command] [options]
```

### Commands

| Command   | Description                                                   |
| :-------- | :------------------------------------------------------------ |
| `install` | Download and install the Cloud SQL Proxy binary (User scope). |
| `update`  | Update the Cloud SQL Proxy binary to the latest version.      |
| `list`    | List available Cloud SQL instances.                           |
| `select`  | Interactively select a Cloud SQL instance to proxy.           |
| `connect` | Connect to a specific instance directly.                      |
| `start`   | Start the proxy for the selected instance.                    |
| `stop`    | Stop the running proxy process.                               |
| `service` | Manage Windows Service (Admin required).                      |
| `env`     | Manage environment variables (User/Machine scope).            |
| `gcloud`  | Manage Google Cloud CLI (install portable version).           |
| `restart` | Restart the proxy process.                                    |
| `status`  | Check if the proxy is running and view details.               |
| `logs`    | View the tail of the proxy logs.                              |
| `doctor`  | Run diagnostics to verify environment setup.                  |
| `reset`   | Reset configuration and remove local files.                   |

### Example

```powershell
# 1. Install the proxy
cloudsqlctl install

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
`%LOCALAPPDATA%\CloudSQLCTL`

- `config.json`: User preferences and selected instance.
- `logs/`: Application and proxy logs.
- `bin/`: The `cloud_sql_proxy.exe` binary.

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
