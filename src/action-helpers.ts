import * as core from '@actions/core'
import trdl = require("./trdl-client")

export function getActionTrdlClientOptions(): trdl.TrdlClientOptions {
    var opts: trdl.TrdlClientOptions

    opts = {
        vaultAddr: core.getInput('vault-addr', { required: true }),
        retry: core.getInput('retry', { required: false }) === 'true' || false,
        maxDelay: parseInt(core.getInput('max-delay', { required: false })) || 21600
    }

    var vaultToken = core.getInput('vault-token')
    if (vaultToken != "") {
        opts.vaultToken = vaultToken
    }

    var authMethod = core.getInput('vault-auth-method')
    if (authMethod != "") {
        if (opts.vaultToken != null) {
            throw `unable to use vault-token and non empty vault-auth-method at the same time`
        }

        switch (authMethod) {
            case "approle":
                opts.vaultApproleAuth = {
                    roleID: core.getInput('vault-role-id', { required: true }),
                    secretID: core.getInput('vault-secret-id', { required: true })
                }
                break

            default:
                throw `unsupported vault-auth-method "${authMethod}", expected "approle" or empty field`
        }
    }

    return opts
}

export function taskLogger(taskID: string, msg: string) {
    console.log(`[${taskID}] ${msg}`)
}
