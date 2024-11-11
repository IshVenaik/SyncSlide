const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from public directory
app.use(express.static('public'));

// Store current page and connected clients
let currentPage = 1;
let clients = new Map();
let adminId = null;

wss.on('connection', (ws) => {
    const clientId = Date.now().toString();
    clients.set(clientId, { ws, isAdmin: false });
    
    // Send initial page number to new client
    ws.send(JSON.stringify({ type: 'pageUpdate', page: currentPage }));
    
    // If this is the first connection, make them admin
    if (clients.size === 1) {
        clients.get(clientId).isAdmin = true;
        adminId = clientId;
        ws.send(JSON.stringify({ type: 'adminStatus', isAdmin: true }));
    }

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        if (data.type === 'pageChange' && clients.get(clientId).isAdmin) {
            currentPage = data.page;
            // Broadcast to all clients except sender
            clients.forEach((client, id) => {
                if (id !== clientId) {
                    client.ws.send(JSON.stringify({ type: 'pageUpdate', page: currentPage }));
                }
            });
        }
    });

    ws.on('close', () => {
        clients.delete(clientId);
        // If admin disconnects, assign new admin
        if (clientId === adminId && clients.size > 0) {
            const newAdminId = clients.keys().next().value;
            clients.get(newAdminId).isAdmin = true;
            adminId = newAdminId;
            clients.get(newAdminId).ws.send(JSON.stringify({ type: 'adminStatus', isAdmin: true }));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});