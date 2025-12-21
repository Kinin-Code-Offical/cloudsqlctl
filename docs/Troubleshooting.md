# Troubleshooting

If you encounter issues with `cloudsqlctl`, follow these steps to diagnose and resolve them.

## The Doctor Command

The first step in troubleshooting is to run the built-in diagnostics tool:

```powershell
cloudsqlctl doctor
```

This command checks:

- **Network Connectivity**: Can you reach Google Cloud APIs?
- **Gcloud CLI**: Is it installed and authenticated?
- **Credentials**: Are Application Default Credentials (ADC) set up correctly?
- **Proxy Binary**: Is the Cloud SQL Proxy binary present and executable?
- **Service Status**: Is the Windows Service healthy (if installed)?

## Common Issues

### "Credential missing" or "Could not find default credentials"

**Cause**: The Cloud SQL Proxy requires Application Default Credentials (ADC) to authenticate with the Google Cloud API.

**Solution**:
Run the following command to generate the ADC file:

```powershell
cloudsqlctl auth adc
```

Or manually: `gcloud auth application-default login`

### "Instance not found" or "403 Forbidden"

**Cause**: The active project selected in `gcloud` might be incorrect, or your account doesn't have permissions for the instance.

**Solution**:

1.  Check your active project:
    ```powershell
    gcloud config get-value project
    ```
2.  Switch projects if necessary:
    ```powershell
    cloudsqlctl setup
    # OR
    gcloud config set project <PROJECT_ID>
    ```
3.  Ensure your user has the `Cloud SQL Client` role.

### Proxy fails to start

**Cause**: Port conflicts (default 5432 for Postgres, 3306 for MySQL) or invalid configuration.

**Solution**:

1.  Check the logs for detailed error messages:
    ```powershell
    cloudsqlctl logs
    ```
2.  Try running the proxy in the foreground to see immediate output:
    ```powershell
    cloudsqlctl start --foreground
    ```

## Resetting Configuration

If your configuration is corrupted, you can reset the tool to its default state:

```powershell
cloudsqlctl reset
```

**Warning**: This will remove your local configuration files and the downloaded proxy binary. You will need to run `cloudsqlctl setup` again.

## Getting Help

If you still have issues, please open an issue on our [GitHub Repository](https://github.com/Kinin-Code-Offical/cloudsqlctl/issues) with the output of `cloudsqlctl doctor` and `cloudsqlctl logs`.
