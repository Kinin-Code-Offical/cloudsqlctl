# Welcome to the CloudSQLCTL Wiki

**CloudSQLCTL** is a Windows-native command-line tool designed to simplify the management of the Google Cloud SQL Auth Proxy. It integrates seamlessly with the `gcloud` CLI to provide a robust, production-ready experience for developers working on Windows.

## Key Features

- **Setup Wizard**: Interactive `setup` command to get everything running in minutes.
- **Authentication Management**: Built-in `auth` command for gcloud login, ADC setup, and Service Account management.
- **Automated Installation**: Downloads and verifies the official Cloud SQL Proxy binary.
- **Instance Management**: Lists and selects Cloud SQL instances using your active `gcloud` configuration.
- **Process Management**: Starts, stops, and restarts the proxy as a background process or Windows Service.
- **Structured Logging**: JSON logging with automatic masking of sensitive tokens.
- **Diagnostics**: Built-in `doctor` command to check environment health (gcloud, ADC, network, service).
- **Self-Update**: Easily update the proxy binary to the latest version.

## Navigation

- [Installation Guide](Installation.md)
- [Configuration & Setup](Configuration.md)
- [Command Reference](commands.md)
- [Troubleshooting](Troubleshooting.md)
- [Contributing](../CONTRIBUTING.md)
