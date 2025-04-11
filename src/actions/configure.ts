import * as core from '@actions/core'
import trdl = require("../trdl-client")
import actionHelpers = require("../action-helpers")

function parseRequiredNumberOfSignatures(): number {
    let requiredNumberOfSignatures = Number(core.getInput('required-number-of-verified-signatures-on-commit', {required: true}))
    if (isNaN(requiredNumberOfSignatures)) {
        throw new Error("Parameter 'required-number-of-verified-signatures-on-commit' must be a number");
    }
    return requiredNumberOfSignatures
}

function removeEmptyFields(config: trdl.ConfigurationOptions): trdl.ConfigurationOptions {
    Object.entries(config).forEach(([key, value]) => {
            if (typeof value === 'string' && value === "") {
                delete config[key];
            }
        });
    return config;
}

async function run(): Promise<void> {
    try {
        const trdlClient = new trdl.TrdlClient(actionHelpers.getActionTrdlClientOptions())
        const projectName = core.getInput('project-name', {required: true})

        const config: trdl.ConfigurationOptions = removeEmptyFields({
            git_repo_url: core.getInput('git-repo-url', {required: true}),
            git_trdl_channels_branch: core.getInput('git-trdl-channels-branch', {required: false}),
            git_trdl_channels_path: core.getInput('git-trdl-channels-path', {required: false}),
            git_trdl_path: core.getInput('git-trdl-path', {required: false}),
            initial_last_published_git_commit: core.getInput('initial-last-published-git-commit', {required: false}),
            required_number_of_verified_signatures_on_commit: parseRequiredNumberOfSignatures(),
            s3_access_key_id: core.getInput('s3-access-key-id', {required: true}),
            s3_bucket_name: core.getInput('s3-bucket-name', {required: true}),
            s3_endpoint: core.getInput('s3-endpoint', {required: true}),
            s3_region: core.getInput('s3-region', {required: true}),
            s3_secret_access_key: core.getInput('s3-secret-access-key', {required: true})
        })

        await trdlClient.configure(projectName, config, actionHelpers.taskLogger)
    } catch (err) {
        console.log(`${err}`)
        core.setFailed(err.message)
    }
}

run()
