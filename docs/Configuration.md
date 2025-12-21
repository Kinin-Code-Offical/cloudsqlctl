# Configuration & Setup

After installing `cloudsqlctl`, you need to configure it to work with your Google Cloud environment.

## The Setup Wizard

The easiest way to configure the tool is to run the interactive setup wizard:

```powershell
cloudsqlctl setup
```

This wizard will guide you through:

1.  **Checking Prerequisites**: Verifies `gcloud` is installed.
2.  **Authentication**: Helps you login to Google Cloud (`gcloud auth login`) and set up Application Default Credentials (`gcloud auth application-default login`).
3.  **Project Selection**: Lets you select the active Google Cloud project.
4.  **Proxy Installation**: Downloads the Cloud SQL Auth Proxy binary if it's missing.

## Manual Configuration

If you prefer to configure things manually or need to change settings later:

### 1. Authentication

Manage your authentication state using the `auth` command:

```powershell
# Check current auth status
cloudsqlctl auth status

# Login to gcloud
cloudsqlctl auth login

# Set up Application Default Credentials (ADC) - Required for the proxy
cloudsqlctl auth adc
```

### 2. Select an Instance

To tell the proxy which database to connect to:

```powershell
# List available instances in your project
cloudsqlctl list

# Interactively select an instance
cloudsqlctl select
```

### 3. Environment Variables

The tool manages several environment variables for you. You can view them with:

```powershell
cloudsqlctl env
```

Key variables:

- `CLOUDSQLCTL_HOME`: Configuration directory (default: `~/.cloudsqlctl`)
- `CLOUDSQLCTL_LOGS`: Log directory
- `CLOUDSQLCTL_PROXY_PATH`: Path to the `cloud-sql-proxy` executable

## Running as a Service

For production or long-running background tasks, you can install the proxy as a Windows Service.

**Note**: This requires an Administrator PowerShell terminal.

```powershell
# Install the service
cloudsqlctl service install

# Start the service
cloudsqlctl service start

# Check status
cloudsqlctl service status

# Remove the service
cloudsqlctl service remove
```
