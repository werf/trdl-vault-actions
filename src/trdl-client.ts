import NodeVault = require("node-vault")
import util = require("util")
import os = require("os")
import {Option} from "node-vault";

type TaskLogger = (taskID: string, msg: string) => void

interface operationContext {
    contextCancelled: boolean
    watchTaskLogsActive: boolean
    watchTaskStatusActive: boolean
    trdlTaskStatus: any
    err?: Error
}

function newOperationContext(): operationContext {
    return {
        contextCancelled: false,
        watchTaskLogsActive: false,
        watchTaskStatusActive: false,
        trdlTaskStatus: null,
    }
}

export interface TrdlClientOptions {
    vaultAddr: string
    vaultToken?: string
    vaultApproleAuth?: VaultApproleAuth
    retry: boolean
    maxDelay: number
}

export interface VaultApproleAuth {
    roleID: string
    secretID: string
}

export class TrdlClient {
    private vaultToken?: string
    private vaultApproleAuth?: VaultApproleAuth
    private vaultClient: NodeVault.client
    private retry: boolean
    private maxDelay: number

    constructor(opts: TrdlClientOptions) {
        this.vaultToken = opts.vaultToken
        this.vaultApproleAuth = opts.vaultApproleAuth
        this.retry = opts.retry
        this.maxDelay = opts.maxDelay

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

    private async longRunningRequest(path: string, data: any, requestOptions?: NodeVault.Option): Promise<any> {
        while (true) {
            try {
                return await this.vaultClient.write(path, data, requestOptions)
            } catch(e) {
                 if (e.message == "busy") {
                     console.log(`Will retry request at ${path} after 5sec: server is busy at the moment`)

                     await this.delay(5000 )

                     continue
                 }

                 throw e
            }
        }
    }

    private async withBackoffRequest(
        path: string, 
        data: any, 
        taskLogger: TaskLogger,
        action: (taskID: string, taskLogger: TaskLogger) => Promise<void>
    ): Promise<void> {
        const maxBackoff = this.maxDelay * 1000;
        const startTime = Date.now();
        let backoff = 60000;

        while (Date.now() - startTime < maxBackoff) {
            try {
                const resp = await this.longRunningRequest(path, data, await this.prepareVaultRequestOptions());
                await action(resp.data.task_uuid, taskLogger); 
                return;
            } catch (e) {
                console.error(`[ERROR] ${e}`);
            }

            if (!this.retry) {
                throw `${path} operation failed and retry is disabled`;
            }

            console.log(`[INFO] Retrying ${path} after ${backoff / 1000 / 60} minutes...`);
            await this.delay(backoff);

            backoff = Math.min(backoff * 2, maxBackoff);
        }

        throw `${path} operation exceeded maximum duration`;
    }

    async release(projectName: string, gitTag: string, taskLogger: TaskLogger): Promise<void> {
        await this.withBackoffRequest(
            `${projectName}/release`,
            { git_tag: gitTag }, 
            taskLogger, 
            async (taskID, taskLogger) => {
                await this.watchTask(projectName, taskID, taskLogger);
            }
        );
    }

    async publish(projectName: string, taskLogger: TaskLogger): Promise<void> {
        await this.withBackoffRequest(
            `${projectName}/publish`,
            {},
            taskLogger,
            async (taskID, taskLogger) => {
                await this.watchTask(projectName, taskID, taskLogger);
            }
        );
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
                await this.gracefulShutdown(ctx)

                console.log(`[ERROR] Task ${taskID} error: ${ctx.err}`)
                throw ctx.err
            }

            if (ctx.trdlTaskStatus != null) {
                if (ctx.trdlTaskStatus.status == "FAILED") {
                    await this.gracefulShutdown(ctx)
                    throw `trdl task ${taskID} have failed: ${ctx.trdlTaskStatus.reason}`
                }

                if (ctx.trdlTaskStatus.status == "SUCCEEDED") {
                    await this.gracefulShutdown(ctx)
                    return
                }
            }

            await this.delay(200)
        }
    }

    private async gracefulShutdown(ctx: operationContext): Promise<void> {
        ctx.contextCancelled = true

        while (true) {
            //console.log(`[DEBUG] Check context "${ctx.watchTaskStatusActive}" "${ctx.watchTaskLogsActive}"`)
            if (!ctx.watchTaskStatusActive && !ctx.watchTaskLogsActive) {
                return
            }
            await this.delay(200)
        }

        //console.log(`[DEBUG] graceful shutdown done`)
    }

    private async watchTaskStatus(ctx: operationContext, projectName: string, taskID: string): Promise<void> {
        ctx.watchTaskStatusActive = true

        var shutdown = false

        while (true) {
            if (ctx.contextCancelled) {
                // Perform last request after context has been cancelled for graceful shutdown
                shutdown = true
            }

            var resp = await this.vaultClient.read(`${projectName}/task/${taskID}`, await this.prepareVaultRequestOptions())

            ctx.trdlTaskStatus = resp.data

            if (shutdown) {
                ctx.watchTaskStatusActive = false
                //console.log(`[DEBUG] Watch task ${taskID} status operation has been stopped`)
                break
            }

            await this.delay(200)
        }
    }

    private async watchTaskLogs(ctx: operationContext, projectName: string, taskID: string, taskLogger: TaskLogger): Promise<void> {
        ctx.watchTaskLogsActive = true

        var cursor = 0
        var shutdown = false

        while (true) {
            if (ctx.contextCancelled) {
                // Perform last request after context has been cancelled for graceful shutdown
                shutdown = true
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

            if (shutdown) {
                ctx.watchTaskLogsActive = false
                //console.log(`[DEBUG] Watch task ${taskID} logs operation has been stopped`)
                break
            }

            await this.delay(200)
        }
    }

    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
