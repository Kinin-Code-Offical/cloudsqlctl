# Cloud SQL Proxy CLI Reference

**Version:** 0.4.15
**Generated:** 2025-12-22

## Overview

```text
Usage: cloudsqlctl [options] [command]

CLI for managing Google Cloud SQL Auth Proxy

Options:
  -V, --version                 output the version number
  -h, --help                    display help for command

Commands:
  install [options]             Download and install Cloud SQL Proxy
  update                        Update Cloud SQL Proxy to the latest version
  select                        Select a Cloud SQL instance
  list [options]                List available Cloud SQL instances
  connect [options] <instance>  Connect to a specific Cloud SQL instance
  start [options]               Start the Cloud SQL Proxy
  stop                          Stop the Cloud SQL Proxy or Service
  status                        Check the status of the Cloud SQL Proxy and
                                Service
  logs [options]                View the tail of the proxy logs
  doctor                        Run diagnostics to verify environment setup
  reset [options]               Reset configuration and remove local files
  env                           Manage environment variables
  service                       Manage the Cloud SQL Proxy Windows Service
                                (Requires Admin)
  ps1                           Manage PowerShell scripts
  repair                        Self-heal missing or corrupted files and
                                configurations
  check [options]               Verify full system configuration
  gcloud                        Manage Google Cloud CLI
  auth                          Manage authentication and credentials
  setup                         Interactive setup wizard
  paths                         Show resolved system paths and configuration
                                locations
  upgrade [options]             Upgrade cloudsqlctl to the latest version
  support                       Support utilities
  help [command]                display help for command
```

## Commands

### install

```text
Usage: cloudsqlctl install [options]

Download and install Cloud SQL Proxy

Options:
  -v, --version <version>  Specific version to install
  -h, --help               display help for command
```

### update

```text
Usage: cloudsqlctl update [options]

Update Cloud SQL Proxy to the latest version

Options:
  -h, --help  display help for command
```

### select

```text
Usage: cloudsqlctl select [options]

Select a Cloud SQL instance

Options:
  -h, --help  display help for command
```

### list

```text
Usage: cloudsqlctl list [options]

List available Cloud SQL instances

Options:
  --json      Output as JSON
  -h, --help  display help for command
```

### connect

```text
Usage: cloudsqlctl connect [options] <instance>

Connect to a specific Cloud SQL instance

Arguments:
  instance           Instance connection name (e.g., project:region:instance)

Options:
  -p, --port <port>  Port to listen on (default: 5432)
  -h, --help         display help for command
```

### start

```text
Usage: cloudsqlctl start [options]

Start the Cloud SQL Proxy

Options:
  -p, --port <port>  Port to listen on
  -h, --help         display help for command
```

### stop

```text
Usage: cloudsqlctl stop [options]

Stop the Cloud SQL Proxy or Service

Options:
  -h, --help  display help for command
```

### status

```text
Usage: cloudsqlctl status [options]

Check the status of the Cloud SQL Proxy and Service

Options:
  -h, --help  display help for command
```

### logs

```text
Usage: cloudsqlctl logs [options]

View the tail of the proxy logs

Options:
  -n, --lines <lines>  Number of lines to show (default: 20)
  -h, --help           display help for command
```

### doctor

```text
Usage: cloudsqlctl doctor [options]

Run diagnostics to verify environment setup

Options:
  -h, --help  display help for command
```

### reset

```text
Usage: cloudsqlctl reset [options]

Reset configuration and remove local files

Options:
  --yes       Confirm reset without prompting
  -h, --help  display help for command
```

### env

```text
Usage: cloudsqlctl env [options] [command]

Manage environment variables

Options:
  -h, --help      display help for command

Commands:
  set [options]   Set environment variables
  help [command]  display help for command
```

### service

```text
Usage: cloudsqlctl service [options] [command]

Manage the Cloud SQL Proxy Windows Service (Requires Admin)

Options:
  -h, --help           display help for command

Commands:
  install [options]    Install the Windows Service
  configure [options]  Update Service Configuration
  remove               Remove the Windows Service
  start                Start the Windows Service
  stop                 Stop the Windows Service
  status               Check Service Status
  startup <type>       Set Service Startup Type
  help [command]       display help for command
```

### ps1

```text
Usage: cloudsqlctl ps1 [options] [command]

Manage PowerShell scripts

Options:
  -h, --help      display help for command

Commands:
  generate        Generate management PowerShell scripts
  help [command]  display help for command
```

### repair

```text
Usage: cloudsqlctl repair [options]

Self-heal missing or corrupted files and configurations

Options:
  -h, --help  display help for command
```

### check

```text
Usage: cloudsqlctl check [options]

Verify full system configuration

Options:
  --scope <scope>  Environment scope (User, Machine, or auto) (default: "auto")
  -h, --help       display help for command
```

### gcloud

```text
Usage: cloudsqlctl gcloud [options] [command]

Manage Google Cloud CLI

Options:
  -h, --help      display help for command

Commands:
  status          Check gcloud CLI status
  install         Install portable Google Cloud CLI
  help [command]  display help for command
```

### auth

```text
Usage: cloudsqlctl auth [options] [command]

Manage authentication and credentials

Options:
  -h, --help                     display help for command

Commands:
  status                         Check authentication status
  login                          Login via gcloud
  adc                            Setup Application Default Credentials
  project <projectId>            Set active project
  set-service-account [options]  Configure service account credentials
  list-keys                      List available service account keys
  select-key [options]           Interactively select a service account key
  help [command]                 display help for command
```

### setup

```text
Usage: cloudsqlctl setup [options]

Interactive setup wizard

Options:
  -h, --help  display help for command
```

### paths

```text
Usage: cloudsqlctl paths [options]

Show resolved system paths and configuration locations

Options:
  -h, --help  display help for command
```

### upgrade

```text
Usage: cloudsqlctl upgrade [options]

Upgrade cloudsqlctl to the latest version

Options:
  --check-only         Only check for updates, do not download or install
  --no-install         Download only, do not install
  --asset <mode>       Asset type to download (auto, installer, exe) (default:
                       "auto")
  --dir <path>         Download directory (default:
                       "<USER_HOME>\\AppData\\Local\\CloudSQLCTL\\downloads\\updates")
  --force              Force update even if version is same or older
  --no-silent          Run installer in interactive mode (installer only)
  --no-elevate         Do not attempt to elevate privileges (installer only)
  --channel <channel>  Update channel (stable or beta)
  --version <version>  Install a specific version (e.g. 0.4.14 or v0.4.14)
  --pin <version>      Pin to a specific version for future upgrades
  --unpin              Clear pinned version
  --json               Output status in JSON format
  -h, --help           display help for command
```

### support

```text
Usage: cloudsqlctl support [options] [command]

Support utilities

Options:
  -h, --help        display help for command

Commands:
  bundle [options]  Create a support bundle zip with logs, config, doctor,
                    paths, and status
  help [command]    display help for command
```
