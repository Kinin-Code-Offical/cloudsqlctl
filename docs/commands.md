# Cloud SQL Proxy CLI Reference

**Version:** 0.3.56
**Generated:** 2025-12-21

## Overview

```
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
  help [command]                display help for command
```

## Commands

### install

```
Usage: cloudsqlctl install [options]

Download and install Cloud SQL Proxy

Options:
  -v, --version <version>  Specific version to install
  -h, --help               display help for command
```

### update

```
Usage: cloudsqlctl update [options]

Update Cloud SQL Proxy to the latest version

Options:
  -h, --help  display help for command
```

### select

```
Usage: cloudsqlctl select [options]

Select a Cloud SQL instance

Options:
  -h, --help  display help for command
```

### list

```
Usage: cloudsqlctl list [options]

List available Cloud SQL instances

Options:
  --json      Output as JSON
  -h, --help  display help for command
```

### connect

```
Usage: cloudsqlctl connect [options] <instance>

Connect to a specific Cloud SQL instance

Arguments:
  instance           Instance connection name (e.g., project:region:instance)

Options:
  -p, --port <port>  Port to listen on (default: 5432)
  -h, --help         display help for command
```

### start

```
Usage: cloudsqlctl start [options]

Start the Cloud SQL Proxy

Options:
  -p, --port <port>  Port to listen on
  -h, --help         display help for command
```

### stop

```
Usage: cloudsqlctl stop [options]

Stop the Cloud SQL Proxy or Service

Options:
  -h, --help  display help for command
```

### status

```
Usage: cloudsqlctl status [options]

Check the status of the Cloud SQL Proxy and Service

Options:
  -h, --help  display help for command
```

### logs

```
Usage: cloudsqlctl logs [options]

View the tail of the proxy logs

Options:
  -n, --lines <lines>  Number of lines to show (default: 20)
  -h, --help           display help for command
```

### doctor

```
Usage: cloudsqlctl doctor [options]

Run diagnostics to verify environment setup

Options:
  -h, --help  display help for command
```

### reset

```
Usage: cloudsqlctl reset [options]

Reset configuration and remove local files

Options:
  --yes       Confirm reset without prompting
  -h, --help  display help for command
```

### env

```
Usage: cloudsqlctl env [options] [command]

Manage environment variables

Options:
  -h, --help      display help for command

Commands:
  set [options]   Set environment variables
  help [command]  display help for command
```

### service

```
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
  help [command]       display help for command
```

### ps1

```
Usage: cloudsqlctl ps1 [options] [command]

Manage PowerShell scripts

Options:
  -h, --help      display help for command

Commands:
  generate        Generate management PowerShell scripts
  help [command]  display help for command
```

### repair

```
Usage: cloudsqlctl repair [options]

Self-heal missing or corrupted files and configurations

Options:
  -h, --help  display help for command
```

### check

```
Usage: cloudsqlctl check [options]

Verify full system configuration

Options:
  --scope <scope>  Environment scope (User, Machine, or auto) (default: "auto")
  -h, --help       display help for command
```

### gcloud

```
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

```
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
  help [command]                 display help for command
```

### setup

```
Usage: cloudsqlctl setup [options]

Interactive setup wizard

Options:
  -h, --help  display help for command
```

### paths

```
Usage: cloudsqlctl paths [options]

Show resolved system paths and configuration locations

Options:
  -h, --help  display help for command
```

