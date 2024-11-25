const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 4200;
const MAX_CONNECTIONS = 50;
const FILE_DIRECTORY = "Files";
const filePath = path.join(__dirname, FILE_DIRECTORY);
const PASSWORD = "password";

currentConnections = [];

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
    switch(jsonMessage.Method) {
        case 'CONNECT':
            if (jsonMessage.Password != PASSWORD) {
                ws.send(createErrorMessage(RESPONSE_STATUS.ConnectionRejected, RESPONSE_TEXT.ConnectionRejected, -1));
                return;
            }
            if (currentConnections.length >= MAX_CONNECTIONS) {
                ws.send(createErrorMessage(RESPONSE_STATUS.ConnectionLimitReached, RESPONSE_TEXT.ConnectionLimitReached, -1));
                return;
            }
            createdConnection = new Connection();
            response.ClientId = createdConnection.getClientId();
            currentConnections.push(createdConnection);
            let endpointList = [];
            for (let pdf of pdfFiles) {
                endpointList.push("DISPLAYPDF " + pdf);
            }for (let html of htmlFiles) {
                endpointList.push("DISPLAYHTML " + html);
            }
            response.EndpointList = endpointList;
            response.Status = RESPONSE_STATUS.OK;
            response.StatusText = RESPONSE_TEXT.OK;
            ws.send(JSON.stringify(response));
            break;
        case 'DISPLAYHTML':
            response.ClientId = jsonMessage.ClientId;
            response.HTMLTitle = jsonMessage.Endpoint;
            fs.readFile(path.join(filePath, jsonMessage.Endpoint), { encoding: 'utf8' }, (err, data) => {
                if (err) {
                    ws.send(createErrorMessage(RESPONSE_STATUS.FileNotFound, RESPONSE_TEXT.FileNotFound, response.ClientId));
                    return;
                }
                response.HTML = data;
                response.Status = RESPONSE_STATUS.OK;
                response.StatusText = RESPONSE_TEXT.OK;
                setConnectionTime(jsonMessage.ClientId);
                ws.send(JSON.stringify(response));
            });
            break;
        case 'DISPLAYPDF':
            response.ClientId = jsonMessage.ClientId;
            response.PDFTitle = jsonMessage.Endpoint;
            fs.readFile(path.join(filePath, jsonMessage.Endpoint), { encoding: 'base64' }, (err, data) => {
                if (err) {
                    ws.send(createErrorMessage(ERROR_STATUS.FileNotFound, ERROR_TEXT.FileNotFound, response.ClientId));
                    return;
                }
                response.PDF = data;
                response.Status = RESPONSE_STATUS.OK;
                response.StatusText = RESPONSE_TEXT.OK;
                setConnectionTime(jsonMessage.ClientId);
                ws.send(JSON.stringify(response));
            });
            break;
        case 'UPLOAD':
            const fp = path.join(__dirname, FILE_DIRECTORY, jsonMessage.FileName);

            fs.exists(fp, (exists) => {
                if (!exists) {
                  let data;
                  if (path.extname(jsonMessage.FileName).toLowerCase() == ".pdf") {
                    data = Buffer.from(jsonMessage.FileContent, 'base64');
                  } else {
                    data = jsonMessage.FileContent;
                  }
                  fs.writeFile(fp, data, (err) => {
                    if (err) {
                        ws.send(createErrorMessage(RESPONSE_STATUS.FileUploadError, RESPONSE_TEXT.FileUploadError, jsonMessage.ClientId));
                    } else {
                      if (path.extname(jsonMessage.FileName).toLowerCase() == "pdf") {
                        pdfFiles.push(jsonMessage.FileName);
                      } else {
                        htmlFiles.push(jsonMessage.FileName);
                      }
                    }
                });
                    response.ClientId = jsonMessage.clientId;
                    response.Status = RESPONSE_STATUS.OK;
                    response.StatusText = RESPONSE_TEXT.OK;
                    ws.send(JSON.stringify(response));
                } else {
                  ws.send(createErrorMessage(RESPONSE_STATUS.FileNameUnavalable, RESPONSE_TEXT.FileNameUnavalable, jsonMessage.ClientId));
                }
              });
            break;
        case 'DISCONNECT':
            currentConnections.filter(connection=> connection.getClientId() != jsonMessage.ClientId);
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

function setConnectionTime(clientId) {
    for (const x of currentConnections) {
        if (x.getClientId() == clientId) {
            x.setDateTimeNow();
            return;
        }
    }
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

function removeIdleConnections() {
    for (const x of currentConnections) {
        let tenMinutesInMillesseconds = 600000;
        console.log(x);
        if (Date.now() - x.getDateTime > tenMinutesInMillesseconds) {
            x.ws.close();
            currentConnections.filter(connection=> connection.getClientId() != x.ClientId);
        }
    }
}

setInterval(removeIdleConnections, 30000);
console.log("Server running on 'ws://localhost:" + PORT + "'");

class Connection {
    static nextId = 0;
    clientId;
    lastConnected;

    constructor(ws) {
        this.clientId = Connection.nextId;
        Connection.nextId++;
        this.lastConnected = Date.now();
    }

    getClientId() {
        return this.clientId;
    }

    getDateTime() {
        return this.lastConnected;
    }

    setDateTimeNow() {
        this.lastConnected = Date.now();
    }
}

const RESPONSE_STATUS = Object.freeze({
    OK: 0,
    FileNotFound: 1,
    FileNameUnavalable: 2,
    FileUploadError: 3,
    ConnectionRejected: 4,
    ConnectionLimitReached: 5
});

const RESPONSE_TEXT = Object.freeze({
    OK: "OK",
    FileNotFound: "File was not found",
    FileNameUnavalable: "File name is already present, please change it",
    FileUploadError: "An error occured when downloading the file",
    ConnectionRejected: "Connection was rejected",
    ConnectionLimitReached: "Unable to connect, the servers connection limit was reached."
});