import NodeVault = require("node-vault")
import util = require("util")
import os = require("os")

type TaskLogger = (taskID: string, msg: string) => void

interface operationContext {
    contextCancelled: boolean
    trdlTaskStatus: any
    err?: Error
}

function newOperationContext(): operationContext {
    return {
        contextCancelled: false,
        trdlTaskStatus: null,
    }
}

export interface TrdlClientOptions {
    vaultAddr: string
    vaultToken?: string
    vaultApproleAuth?: VaultApproleAuth
}

export interface VaultApproleAuth {
    roleID: string
    secretID: string
}

export class TrdlClient {
    private vaultToken?: string
    private vaultApproleAuth?: VaultApproleAuth
    private vaultClient: NodeVault.client

    constructor(opts: TrdlClientOptions) {
        this.vaultToken = opts.vaultToken
        this.vaultApproleAuth = opts.vaultApproleAuth

        if (this.vaultToken != null && this.vaultApproleAuth != null) {
            throw `unable to use vaultToken and vaultApproleAuth at the same time`
        }

        this.vaultClient = NodeVault({
            endpoint: opts.vaultAddr,
            token: opts.vaultToken,
        })
    }

    private async prepareVaultRequestOptions(opts?: NodeVault.Option): Promise<NodeVault.Option | undefined> {
        if (this.vaultToken != null) {
            return opts
        }

        if (this.vaultApproleAuth != null) {
            var resp = await this.vaultClient.write(`auth/approle/login`, { role_id: this.vaultApproleAuth.roleID, secret_id: this.vaultApproleAuth.secretID })

            opts ||= {}
            opts.headers ||= {}
            opts.headers["X-Vault-Token"] = resp.auth.client_token

            return opts
        }

        return opts
    }

    async release(projectName: string, gitTag: string, taskLogger: TaskLogger): Promise<void> {
        var resp = await this.vaultClient.write(`${projectName}/release`, { git_tag: gitTag }, await this.prepareVaultRequestOptions())
        return this.watchTask(projectName, resp.data.task_uuid, taskLogger)
    }

    async publish(projectName: string, taskLogger: TaskLogger): Promise<void> {
        var resp = await this.vaultClient.write(`${projectName}/publish`, {}, await this.prepareVaultRequestOptions())
        return this.watchTask(projectName, resp.data.task_uuid, taskLogger)
    }

    private async watchTask(projectName: string, taskID: string, taskLogger: TaskLogger): Promise<void> {
        taskLogger(taskID, `Started release task ${taskID}`)

        var ctx = newOperationContext()

        this.watchTaskStatus(ctx, projectName, taskID)
            .catch((err) => {
                ctx.err = new Error(`error during watching task ${taskID} status: ${err.message}`)
            })

        this.watchTaskLogs(ctx, projectName, taskID, taskLogger)
            .catch((err) => {
                ctx.err = new Error(`error during watching task ${taskID} logs: ${err.message}`)
            })

        while (true) {
            if (ctx.err != null) {
                ctx.contextCancelled = true
                throw ctx.err
            }

            if (ctx.trdlTaskStatus != null) {
                if (ctx.trdlTaskStatus.status == "FAILED") {
                    ctx.contextCancelled = true
                    throw `trdl task ${taskID} have failed: ${ctx.trdlTaskStatus.reason}`
                }

                if (ctx.trdlTaskStatus.status == "SUCCEEDED") {
                    ctx.contextCancelled = true
                    return
                }
            }

            await this.delay(200)
        }
    }

    private async watchTaskStatus(ctx: operationContext, projectName: string, taskID: string): Promise<void> {
        while (true) {
            if (ctx.contextCancelled) {
                console.log(`[DEBUG] Watch task ${taskID} status operation has been stopped`)
                return
            }

            var resp = await this.vaultClient.read(`${projectName}/task/${taskID}`, await this.prepareVaultRequestOptions())

            ctx.trdlTaskStatus = resp.data

            await this.delay(200)
        }
    }

    private async watchTaskLogs(ctx: operationContext, projectName: string, taskID: string, taskLogger: TaskLogger): Promise<void> {
        var cursor = 0

        while (true) {
            if (ctx.contextCancelled) {
                console.log(`[DEBUG] Watch task ${taskID} logs operation has been stopped`)
                return
            }

            // console.log(`[DEBUG] cursor before request = ${cursor}`)

            // TODO: Server should give line-by-line logs output, instead of byte-based. Log lines are never written partially as arbitrary bytes-stream.
            var resp = await this.vaultClient.read(`${projectName}/task/${taskID}/log`, await this.prepareVaultRequestOptions({ qs: { limit: 1000000000, offset: cursor } }))
            // taskLogger(taskID, `[DEBUG] trdl task ${taskID} logs chunk:\n${util.inspect(resp)}`)

            if (resp.data.result.length > 0) {
                var logLines = resp.data.result.trim().split(os.EOL)

                for (let line of logLines) {
                    taskLogger(taskID, line.trim())
                }

                cursor += resp.data.result.length
            }

            // console.log(`[DEBUG] cursor after request = ${cursor}`)

            await this.delay(500)
        }
    }

    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
