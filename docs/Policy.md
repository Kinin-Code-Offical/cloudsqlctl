# Enterprise policy.json

Enterprise deployments can enforce guardrails using a machine-scope `policy.json`.

Default location:
- `%ProgramData%\CloudSQLCTL\policy.json`

Override location (for testing):
- `CLOUDSQLCTL_POLICY_PATH=<path>`

## Example

```json
{
  "updates": {
    "enabled": false,
    "channel": "stable",
    "pinnedVersion": "0.4.15"
  },
  "auth": {
    "allowUserLogin": false,
    "allowAdcLogin": true,
    "allowServiceAccountKey": true,
    "allowedScopes": ["Machine"]
  }
}
```

## Behavior

- If `updates.enabled` is `false`, `cloudsqlctl upgrade` will fail with a policy error.
- If `updates.channel` is set, `cloudsqlctl upgrade --channel` cannot override it.
- If `updates.pinnedVersion` is set, `--version`, `--pin`, and `--unpin` are restricted.
- `auth.login`, `auth.adc`, and `auth set-service-account` can be allowed/blocked via `auth.*`.

