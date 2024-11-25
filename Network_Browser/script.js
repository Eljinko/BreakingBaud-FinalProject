var currentServerId;
var currentClientId;
var endpointList = [];

var webSocket;

const PORT = 4200;

/* Once the html page is loaded, it will run this function, which basically sets up the 
functionality for what happens whenever you press on the buttons. This connects the buttons
to their respective functions*/
document.addEventListener('DOMContentLoaded', function() {

    let connectButton = document.getElementById("connect-button");
    connectButton.addEventListener('click', async function() {
        let success = await requestConnection("ws://" + document.getElementById("search-bar").value + ":" + PORT);
        if (!success) {
            alert("Could not establish connection.");
        }
    });

    let endpointButton = document.getElementById("endpoint-button");
    endpointButton.addEventListener('click', async function() {
        requestEndpoint(document.getElementById("endpoint-select").value);
    });

    let disconnectButton = document.getElementById("disconnect-button");
    let id = currentClientId;
    disconnectButton.addEventListener('click', async function() {
        if (currentServerId == undefined) {
            return;
        }
        disconnectFromCurrentServer();
        endpointList = [];
        currentClientId = undefined;
        currentServerId = undefined;
        let endpointSelect = document.getElementById("endpoint-select");
        endpointSelect.innerHTML = `<option value="" disabled selected name="" id="endpoint-option">No server connected</option>`;
        
    })

    let uploadButton = document.getElementById("upload-button");
    uploadButton.addEventListener('click', async function() {
        if (currentServerId == undefined) {
            alert("A connection must be made in order to upload files.");
            return;
        }
        document.getElementById('file-input').click(); 
    });

    let fileUpload = document.getElementById("file-input");
    fileUpload.addEventListener('change', async function() {
        if (this.files.length > 0) {
            console.log("File chosen:", this.files[0]);
        }
        let message = await createUploadFileMessage(this.files[0]);
        webSocket.send(message);
    });
});

/* This function is what is triggered when you press the search button to connect with a server.
What this does is, disconnect from other servers if we are already connected, and attempt 
to create a web socket connection with the server based on the inputted serverId. 
The serverId is in the format <ip address>. 
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
    connectionMessage["Password"] = document.getElementById("password-bar").value;
    connectionMessage["ServerId"] = currentServerId;
    return JSON.stringify(connectionMessage);
}

/* Creates a request message with the desired endpoint. The endpoint will be selected from the dropdown
with the endpoints retrieved from the server upon connection. The endpoint will be a string of form "METHOD ENDPOINT" 
Returns: a string of the request message*/
function createRequestMessage(endpoint) {
    let requestMessage = {};
    let firstSpaceIndex = endpoint.indexOf(' ');
    requestMessage["Method"] = endpoint.substring(0, firstSpaceIndex);
    requestMessage["Endpoint"] = endpoint.substring(firstSpaceIndex + 1);
    requestMessage["ServerId"] = currentServerId;
    requestMessage["ClientId"] = currentClientId;
    requestMessage["Body"] = null;
    return JSON.stringify(requestMessage);
}

async function createUploadFileMessage(file) {
    let uploadMessage = {};
    uploadMessage["Method"] = "UPLOAD";
    uploadMessage["ServerId"] = currentServerId;
    uploadMessage["ClientId"] = currentClientId;
    uploadMessage["FileName"] = file.name;
    uploadMessage["FileContent"] = await readFileAsDataURL(file);

    return JSON.stringify(uploadMessage);
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = reject;

        if (file.type === "application/pdf") {
            reader.readAsDataURL(file);
        } else if (file.type === "text/html") {
            reader.readAsText(file, "UTF-8");
        }
    });
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
            if (jsonMessage.Status != RESPONSE_STATUS.OK) {
                alert(jsonMessage.StatusText);
                currentClientId = undefined;
                currentServerId = undefined;
                return;
            }
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
            if (jsonMessage.Status != RESPONSE_STATUS.OK) {
                alert(jsonMessage.StatusText);
                return;
            }
            displayHTML(jsonMessage.HTMLTitle, jsonMessage.HTML);
            break;
        case 'DISPLAYPDF':
            if (jsonMessage.Status != RESPONSE_STATUS.OK) {
                alert(jsonMessage.StatusText);
                return;
            }
            displayPDF(jsonMessage.PDFTitle, jsonMessage.PDF);
            break;
        case "UPLOAD":
            let iframe = document.getElementById("file-content");
            if (jsonMessage.Status != RESPONSE_STATUS.OK) {
                alert(jsonMessage.StatusText);
            } else {
                iframe.src = "static/Upload_Success.html";
            }
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
    const pdfBlob = base64ToBlob(pdf, 'application/pdf');
    const url = URL.createObjectURL(pdfBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    let iframe = document.getElementById("file-content");
    iframe.src = url;
}

/* Helper function to convert Base64 encoded data to a Blob */
function base64ToBlob(base64, contentType) {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, {type: contentType});
}

const RESPONSE_STATUS = Object.freeze({
    OK: 0,
    FileNotFound: 1,
    FileNameUnavalable: 2,
    FileUploadError: 3,
    ConnectionRejected: 4,
    ConnectionLimitReached: 5,
    ConnectionTimeOut: 6
});