import * as core from '@actions/core'
import trdl = require("../trdl-client")
import actionHelpers = require("../action-helpers")

async function run(): Promise<void> {
    try {
        var trdlClient = new trdl.TrdlClient(actionHelpers.getActionTrdlClientOptions())
        var projectName = core.getInput('project-name', { required: true })

        await trdlClient.publish(projectName, actionHelpers.taskLogger)
    } catch (err) {
        console.log(`${err}`)
        core.setFailed(err.message)
    }
}

run()
