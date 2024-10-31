var currentServerId;
var currentNetworkId;
var endpointList = [];
var currentEncryptionCode;


document.addEventListener('DOMContentLoaded', function() {

    let connectButton = document.getElementById("connect-button");
    connectButton.addEventListener('click', async function() {
        console.log('Connect button was clicked!');
        let success = await requestConnection(document.getElementById("search-bar").value);
        if (!success) {
            return;
        }
    });

    let endpointButton = document.getElementById("endpoint-button");
    endpointButton.addEventListener('click', async function() {
        console.log('Endpoint button was clicked!');
        let success = await requestEndpoint(document.getElementById("endpoint-select").value);
        if (!success) {
            return;
        }
    });
});

async function requestConnection(serverId) {
    console.log(serverId);
    return true;
}

async function requestEndpoint(endpoint) {
    if (endpoint == "") {
        alert("Please connect to a server to access its endpoints.")
        return false;
    }
    console.log(endpoint);
    return true;
}