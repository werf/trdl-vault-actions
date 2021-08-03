import trdl = require("../trdl-client")

var trdlClient = new trdl.TrdlClient({
    vaultAddr: 'http://172.17.0.4:8200',
    vaultToken: 'root'
});

console.log("Before release")

trdlClient.publish("trdl-test-project", (taskID, msg) => { console.log(`[${taskID}] ${msg}`) })
    .then(() => {
        console.log("Publish done!")
    })
    .catch((err) => {
        console.log(`${err}`)
        process.exit(1)
    })
