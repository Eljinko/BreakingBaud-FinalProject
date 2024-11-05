var currentServerId;
var currentClientId;
var endpointList = [];
var currentEncryptionCode;

var webSocket;

/* Once the html page is loaded, it will run this function, which basically sets up the 
functionality for what happens whenever you press on the buttons. This connects the buttons
to their respective functions*/
document.addEventListener('DOMContentLoaded', function() {

    let connectButton = document.getElementById("connect-button");
    connectButton.addEventListener('click', async function() {
        let success = await requestConnection("ws://" + document.getElementById("search-bar").value);
        if (!success) {
            alert("Could not establish connection.");
        }
    });

    let endpointButton = document.getElementById("endpoint-button");
    endpointButton.addEventListener('click', async function() {
        requestEndpoint(document.getElementById("endpoint-select").value);
    });
});

/* This function is what is triggered when you press the search button to connect with a server.
What this does is, disconnect from other servers if we are already connected, and attempt 
to create a web socket connection with the server based on the inputted serverId. 
The serverId is in the format <ip address>:<port number>. 
Returns: true or false based on whether the web socket creation is successful */
async function requestConnection(serverId) {
    if (currentServerId == serverId) {
        alert("Already connected to this server.");
        return true;
    } else if (currentServerId != serverId && currentServerId != undefined) {
        disconnectFromCurrentServer();
    } 
    currentServerId = undefined;
    currentClientId = undefined;
    endpointList = [];
    try {
        webSocket = await createWebSocket(serverId);
        return true;
    } catch (isConnected) {
        return false;
    }
}

/* Will create a web socket with the serverId. This function also defines the behavior of
the websocket, defining functions that will occur in the event of opening/ creation, 
error/inability to create, in the event of a message received, and when the connection is closed.
Returns: the web socket it successful, else it returns undefined*/
function createWebSocket(serverId) {
    return new Promise((resolve, reject) => {
        webSocket = new WebSocket(serverId);
        webSocket.onopen = () => {
            console.log('Connected to the server!'); 
            currentServerId = serverId;
            webSocket.send(createConnectionMessage());
            resolve(webSocket);
        };
        webSocket.onerror = (error) => {
            reject(undefined);
        };
        webSocket.onmessage = (event) => {
            handleMessage(event.data);
        };
        webSocket.onclose = (event) => {
            webSocket = undefined;
            currentServerId = undefined;
            currentClientId = undefined;
            endpointList = [];
            console.log('Disconnected from server, ', event.reason);
        };
    });
}
/* Requesting an endpoint is necessary to retrieve the desired file. This will fail if we aren't
connected to a web socket. If we are, we'll create the request message, and send it.
Returns: true if the message is sent, false if the message is not sent. */
async function requestEndpoint(endpoint) {
    if (webSocket == undefined || endpoint == "") {
        alert("Please connect to a server to access its endpoints.")
        return false;
    }
    let message = createRequestMessage(endpoint);
    webSocket.send(message);
    return true;
}

/* Creates a disconnect message, and sends it  */
function disconnectFromCurrentServer() {
    let disconnectionMessage = {};
    disconnectionMessage["Method"] = "DISCONNECT";
    disconnectionMessage["ServerId"] = currentServerId;
    disconnectionMessage["ClientId"] = currentClientId;
    webSocket.send(JSON.stringify(disconnectionMessage));
}

/* Creates a connection message and returns it
Returns: a string of the connection message */
function createConnectionMessage() {
    let connectionMessage = {};
    connectionMessage["Method"] = "CONNECT";
    connectionMessage["ServerId"] = currentServerId;
    return JSON.stringify(connectionMessage);
}

/* Creates a request message with the desired endpoint. The endpoint will be selected from the dropdown
with the endpoints retrieved from the server upon connection. The endpoint will be a string of form "METHOD ENDPOINT" 
Returns: a string of the request message*/
function createRequestMessage(endpoint) {
    let requestMessage = {};
    let path = endpoint.split(' ');
    requestMessage["Method"] = path[0];
    requestMessage["Endpoint"] = path[1];
    requestMessage["ServerId"] = currentServerId;
    requestMessage["ClientId"] = currentClientId;
    requestMessage["Body"] = null;
    return JSON.stringify(requestMessage);
}

/* As web socket communication is bidirectional, we will need to have a way to handle incoming messages that 
are responses to our messages. The message comes in the form of a string which we parse into JSON. See the 
JSON response format in the README for more detail. We handle the response accordingly.*/
function handleMessage(message) {
    console.log(message);
    let jsonMessage = JSON.parse(message);
    let body;
    switch(jsonMessage.Method) {
        case 'CONNECT':
            currentClientId = jsonMessage.ClientId;
            endpointList = jsonMessage.EndpointList;
            console.log(endpointList);
            let endpointSelect = document.getElementById("endpoint-select");
            endpointSelect.innerHTML = "";
            for (endpoint of endpointList) {
                endpointSelect.innerHTML += `<option value="` + endpoint + `">` + endpoint +`</option>`;
            }
            break;
        case 'DISPLAYHTML':
            displayHTML(jsonMessage.HTMLTitle, jsonMessage.HTML);
            break;
        case 'DISPLAYPDF':
            displayPDF(jsonMessage.PDFTitle, jsonMessage.PDF);
            break;
        case 'DISCONNECT':
            // Not needed, as the onclose function will handle this, and we will jsut close the 
            // connection, no need to send back a message
            break;
        default:
            console.log("Unidentifiable message received: " + jsonMessage);
            break;
    }
}

/* Function that displays the retrieved html, and downloads it */
function displayHTML(title, html) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    let iframe = document.getElementById("file-content");
    iframe.src = url;
}

/* Function that displays the retrieved pdf */
function displayPDF(title, pdf) {
    console.log(pdf);
}
