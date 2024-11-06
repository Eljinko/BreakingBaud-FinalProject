# BreakingBaud-FinalProject

## Genral outline


## The client

## The server

## Methods
1. CONNECT
2. DISPLAYPDF
3. DISPLAYHTML
4. DISCONNECT

## Formatting
### Requests
Below are the method types and their respective fields
{
  "Method": "CONNECT",
  "ServerId": currentServerId,
}

{
  "Method": "DISPLAYPDF" or "DISPLATHTML,
  "Endpoint": "filename",
  "ServerId": currentServerId,
  "ClientId": currentClientId,
  "Body": null <(can be filled if needed)>
}

{
  "Method": "DISCONNECT",
  "ServerId": currentServerId,
  "ClientId": currentClientId
}

### Responses
Here are the response formats for the incoming  messages
{
  "Method": "CONNECT",
  "Status": 400,
  "Status Text": "Good Response",
  "ClientId": <some client number that is allocated to it for the length of the connection>,
  "EndpointList": [List of endpoints]
}

{
  "Method": "DISPLAYPDF",
  "Status": 400,
  "Status Text": "Good Response",
  "ClientId": <some client number that is allocated to it for the length of the connection>,
  "PDFTitle" : the pdf title,
  "PDF": <pdf packaged in numerical format>
}

{
  "Method": "DISPLAYHTML",
  "Status": 400,
  "Status Text": "Good Response",
  "ClientId": <some client number that is allocated to it for the length of the connection>,
  "HTMLTitle": the html title,
  "HTML": HTML in utf-8 (character) format
}

## Web Sockets