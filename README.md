# trdl-vault-actions

Set of actions to publish releases of applications using trdl vault server:

- [werf/trdl-vault-actions/release](#release);
- [werf/trdl-vault-actions/publish](#publish).

## Release

```
release:
  name: Release
  runs-on: ubuntu-latest
  steps:
    - name: Prepare git info
      id: git_info
      run: |
        echo ::set-output name=GIT_TAG::${GITHUB_REF#refs/tags/}

    - name: Release
      uses: werf/trdl-vault-actions/release@main
      with:
        vault-addr: ${{ secrets.VAULT_ADDR }}
        vault-token: ${{ secrets.VAULT_TOKEN }}
        project-name: myproject
        git-tag: ${{ steps.git_info.outputs.GIT_TAG }}
```

## Publish

```
release:
  name: Release
  runs-on: ubuntu-latest
  steps:
    - name: Release
      uses: werf/trdl-vault-actions/publish@main
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
