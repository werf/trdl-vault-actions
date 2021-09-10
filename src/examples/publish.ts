import trdl = require("../trdl-client")

var trdlClient = new trdl.TrdlClient({
    vaultAddr: process.env.VAULT_ADDR || 'http://172.17.0.4:8200',
    vaultToken: process.env.VAULT_TOKEN || 'root'
});

console.log("Before release")

trdlClient.publish(process.env.TRDL_RELEASE_PROJECT_NAME || "trdl-test-project", (taskID, msg) => { console.log(`[${taskID}] ${msg}`) })
    .then(() => {
        console.log("Publish done!")
    })
    .catch((err) => {
        console.log(`${err}`)
        process.exit(1)
    })
