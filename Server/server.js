const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 4200;
var currentConnections = [];

const filePath = path.join(__dirname, 'Files');
var pdfFiles = [];
var htmlFiles = [];

/* Create the server, hosting on the desired port, and define the behavior when we retrieve a message. */
const server = new WebSocket.Server({ port: PORT });
server.on('connection', function connection(ws) {
    ws.on('message', function (message) {
        handleRequest(ws, message);
    });
});

/* This is the behavior that occurs whenever we recieve a message. This involves conversion from string to json format,
then different behavior based on the method of the request. */
function handleRequest(ws, message) {
    let jsonMessage = JSON.parse(message);
    console.log(jsonMessage);
    let response = {};
    response.Method = jsonMessage.Method;
    response.Status = 400;
    response.StatusText = "OK";
    switch(jsonMessage.Method) {
        case 'CONNECT':
            response.ClientId = 0; // temp client id
            currentConnections.push(response.ClientId);
            let endpointList = [];
            for (let pdf of pdfFiles) {
                endpointList.push("DISPLAYPDF " + pdf);
            }for (let html of htmlFiles) {
                endpointList.push("DISPLAYHTML " + html);
            }
            response.EndpointList = endpointList;
            ws.send(JSON.stringify(response));
            break;
        case 'DISPLAYHTML':
            response.ClientId = jsonMessage.ClientId;
            response.HTMLTitle = jsonMessage.Endpoint;
            fs.readFile(path.join(filePath, jsonMessage.Endpoint), { encoding: 'utf8' }, (err, data) => {
                if (err) {
                    ws.send(createErrorMessage(200, "File not found", response.ClientId));
                    return;
                }
                response.HTML = data;
                ws.send(JSON.stringify(response));
            });
            break;
        case 'DISPLAYPDF':
            response.ClientId = jsonMessage.ClientId;
            response.PDFTitle = jsonMessage.Endpoint;
            fs.readFile(path.join(filePath, jsonMessage.Endpoint), { encoding: 'base64' }, (err, data) => {
                if (err) {
                    ws.send(createErrorMessage(200, "File not found", response.ClientId));
                    return;
                }
                response.PDF = data;
                ws.send(JSON.stringify(response));
            });
            break;
        case 'DISCONNECT':
            currentConnections.filter(clientId => clientId != jsonMessage.ClientId);
            ws.close();
            break;
        default:
            console.log("Unidentifiable message received: " + jsonMessage);
            break;
    }
}

/* Creates an error message to send back, with error status number and response */
function createErrorMessage(errorNumber, errorMessage, clientId) {
    let toReturn = {};
    toReturn.ClientId = clientId;
    toReturn.Status = errorNumber;
    toReturn.StatusText = errorMessage;
    return JSON.stringify(toReturn);
}

/* Add all current files to the pdfFiles and htmlFiles  array*/
fs.readdir(filePath, (err, files) => {
    if (err) {
        console.log('Unable to scan directory: ' + err);
        process.exit();
    }

    files.forEach(file => {
        if (path.extname(file) === '.html') {
            htmlFiles.push(file);
        } else if (path.extname(file) === '.pdf') {
            pdfFiles.push(file);
        }
    });
});

console.log("Server running on 'ws://localhost:" + PORT + "'");