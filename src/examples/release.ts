import trdl = require("../trdl-client")

var trdlClient = new trdl.TrdlClient({
    vaultAddr: 'http://172.17.0.4:8200',
    vaultToken: 'root'
});

console.log("Before release")

trdlClient.release("trdl-test-project", "v0.1.20", (taskID, msg) => { console.log(`[${taskID}] ${msg}`) })
    .then(() => {
        console.log("Release done!")
    })
    .catch((err) => {
        console.log(`${err}`)
        process.exit(1)
    })
