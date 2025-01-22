# trdl-vault-actions

Set of actions to publish releases of applications using trdl vault server:

- [werf/trdl-vault-actions/release](#release);
- [werf/trdl-vault-actions/publish](#publish).

## Release

```
release:
  name: Perform werf release using trdl server
  runs-on: ubuntu-22.04
  steps:
    - name: Release without retry
      if: inputs.retry == 'false'
      uses: werf/trdl-vault-actions/release@main
      with:
        vault-addr: ${{ secrets.TRDL_VAULT_ADDR }}
        project-name: werf
        git-tag: ${{ github.ref_name }}
        vault-auth-method: approle
        vault-role-id: ${{ secrets.TRDL_VAULT_ROLE_ID }}
        vault-secret-id: ${{ secrets.TRDL_VAULT_SECRET_ID }}
        retry: false

    - name: Notify
      uses: mattermost/action-mattermost-notify@master
      with:
        MATTERMOST_WEBHOOK_URL: ${{ secrets.LOOP_NOTIFICATION_WEBHOOK }}
        MATTERMOST_CHANNEL: ${{ secrets.LOOP_NOTIFICATION_CHANNEL }}
        TEXT: |
          ${{ secrets.LOOP_NOTIFICATION_GROUP }} [${{ github.workflow }}](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}) task sign pls

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
  name: Publish release channels using trdl server
  runs-on: ubuntu-22.04
  steps:
    - name: Publish without retry
      if: inputs.retry == 'false'
      continue-on-error: true
      uses: werf/trdl-vault-actions/publish@main
      with:
        vault-addr: ${{ secrets.TRDL_VAULT_ADDR }}
        project-name: werf
        vault-auth-method: approle
        vault-role-id: ${{ secrets.TRDL_VAULT_ROLE_ID }}
        vault-secret-id: ${{ secrets.TRDL_VAULT_SECRET_ID }}
        retry: false

    - name: Notify
      uses: mattermost/action-mattermost-notify@master
      with:
        MATTERMOST_WEBHOOK_URL: ${{ secrets.LOOP_NOTIFICATION_WEBHOOK }}
        MATTERMOST_CHANNEL: ${{ secrets.LOOP_NOTIFICATION_CHANNEL }}
        TEXT: |
          ${{ secrets.LOOP_NOTIFICATION_GROUP }} [${{ github.workflow }}](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}) task sign pls

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

### Retry

```
with:
  retry: false
```

A flag that determines whether retries should be enabled in case of failure.
If set to `true`, the system will retry failed operations with an increasing backoff delay until either the operation succeeds or the maximum delay (`maxDelay`) is reached `maxDelay` by default 6 hours or 21600 seconds (equals to github job timeout).
If set to `false`, no retries will occur, and the task will immediately fail upon encountering an error. By default: `true`.
