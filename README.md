# trdl-actions

Set of actions to publish releases of applications using trdl vault server:

- [werf/trdl-actions/release](#release);
- [werf/trdl-actions/publish](#publish).

## Release

```
release:
  name: Release
  runs-on: ubuntu-latest
  steps:
    - name: Release
      uses: werf/trdl-actions/release@main
      with:
        vault-addr: ${{ secrets.VAULT_ADDR }}
        vault-token: ${{ secrets.VAULT_TOKEN }}
        project-name: myproject
        git-tag: v0.1.20
```

## Publish

```
release:
  name: Release
  runs-on: ubuntu-latest
  steps:
    - name: Release
      uses: werf/trdl-actions/publish@main
      with:
        vault-addr: ${{ secrets.VAULT_ADDR }}
        vault-token: ${{ secrets.VAULT_TOKEN }}
        project-name: myproject
```

## Common configuration

### Project name

There should be an instance of vault plugin vault-plugin-secrets-trdl enabled at some mount point. Each project uses a separate vault-plugin-secrets-trdl instance to perform releases. Project name is vault-plugin-secrets-trdl mount point. Project name configured as follows:

```
with:
  project-name: myproject
```

### Authentication

To use static vault client token when performing vault requests set `vault-token` param:

```
with:
  vault-token: ${{ secrets.VAULT_TOKEN }}
```

Authentication using `approle` method is also supported. Action will perform approle authentication to get client token before each request to the vault server.

```
with:
  vault-auth-method: approle
  vault-role-id: ${{ secrets.VAULT_ROLE_ID }}
  vault-secret-id: ${{ secrets.VAULT_SECRET_ID }}
```

**NOTE** `vault-token` and `vault-auth-method=approle` params are mutually exclusive.

### Vault server

```
with:
  vault-addr: ${{ secrets.VAULT_ADDR }}
```
