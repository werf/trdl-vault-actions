import trdl = require("../trdl-client")
import {ConfigurationOptions} from "../trdl-client";

var trdlClient = new trdl.TrdlClient({
    vaultAddr: process.env.VAULT_ADDR || 'http://172.17.0.4:8200',
    vaultToken: process.env.VAULT_TOKEN || 'root'
});

console.log("Before configure")

let config: ConfigurationOptions = {
    git_repo_url: process.env.GIT_REPO_URL || "https://github.com/werf/trdl-vault-actions.git",
    required_number_of_verified_signatures_on_commit: Number(process.env.COMMIT_COUNT) || 1,
    s3_access_key_id: process.env.S3_ACCESS_KEY_ID || "abcdef",
    s3_bucket_name: process.env.S3_BUCKET || "abcdef",
    s3_endpoint: process.env.S3_ENDPOINT || "https://minio.example.com",
    s3_region: process.env.S3_REGION || "eu-central-1",
    s3_secret_access_key: process.env.S3_SECRET_ACCESS_KEY || "abcdef",
}

trdlClient.configure(
    process.env.TRDL_RELEASE_PROJECT_NAME || "trdl-test-project",
    config,
    (taskID, msg) => { console.log(`[${taskID}] ${msg}`) })
    .then(() => {
        console.log("Configuration done!")
    })
    .catch((err) => {
        console.log(`${err}`)
        process.exit(1)
    })
