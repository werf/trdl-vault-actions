# trdl-vault-actions

Set of actions to publish releases of applications using trdl vault server:

- [werf/trdl-vault-actions/release](#release);
- [werf/trdl-vault-actions/publish](#publish).

## Release

```
release:
  name: Release
  runs-on: ubuntu-22.04
  steps:
    - name: Release with retry
      uses: werf/trdl-vault-actions/release@main
      with:
        vault-addr: ${{ secrets.TRDL_VAULT_ADDR }}
        project-name: werf
        git-tag: ${{ github.ref_name }}
        vault-auth-method: approle
        vault-role-id: ${{ secrets.TRDL_VAULT_ROLE_ID }}
        vault-secret-id: ${{ secrets.TRDL_VAULT_SECRET_ID }}
```

## Publish

```
publish:
  name: Publish
  runs-on: ubuntu-22.04
  steps:
    - name: Publish with retry
      uses: werf/trdl-vault-actions/publish@main
      with:
        vault-addr: ${{ secrets.TRDL_VAULT_ADDR }}
        project-name: werf
        vault-auth-method: approle
        vault-role-id: ${{ secrets.TRDL_VAULT_ROLE_ID }}
        vault-secret-id: ${{ secrets.TRDL_VAULT_SECRET_ID }}
```

## Common configuration

### Project name

There should be an instance of vault plugin vault-plugin-secrets-trdl enabled at some mount point. Each project uses a separate vault-plugin-secrets-trdl instance to perform releases. Project name is vault-plugin-secrets-trdl mount point. Project name configured as follows:

```
uses: werf/trdl-vault-actions/publish@main
with:
  project-name: myproject
```

### Authentication

To use static vault client token when performing vault requests set `vault-token` param:

```
uses: werf/trdl-vault-actions/publish@main
with:
  vault-token: ${{ secrets.VAULT_TOKEN }}
```

Authentication using `approle` method is also supported. Action will perform approle authentication to get client token before each request to the vault server.

```
uses: werf/trdl-vault-actions/publish@main
with:
  vault-auth-method: approle
  vault-role-id: ${{ secrets.VAULT_ROLE_ID }}
  vault-secret-id: ${{ secrets.VAULT_SECRET_ID }}
```

**NOTE** `vault-token` and `vault-auth-method=approle` params are mutually exclusive.

### Vault server

```
uses: werf/trdl-vault-actions/publish@main
with:
  vault-addr: ${{ secrets.VAULT_ADDR }}
```

### Retry

```
uses: werf/trdl-vault-actions/publish@main
with:
  retry: true
```

Controls whether retries are enabled for failed operations.

- **`true`** (default): Retries failed operations with exponentially increasing backoff delays, stopping after success or reaching `maxDelay`. The default `maxDelay` is 6 hours (21600 seconds), which matches the GitHub job timeout.  
- **`false`**: No retries. The task fails immediately upon error.
