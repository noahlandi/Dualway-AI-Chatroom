require('dotenv').config();
const axios = require('axios');

const cpen322 = require('./cpen322-tester.js');
const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const Database = require('./Database');
const host = 'localhost';
const port = 3000;
const messageBlockSize = 10;

const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'cpen322-messenger';
const db = new Database(mongoUrl, dbName);
const messages = {};  
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


function logRequest(req, res, next) {
    console.log(`${new Date()} ${req.ip} : ${req.method} ${req.path}`);
    next();
}
app.use(logRequest);

const clientApp = path.join(__dirname, 'client');
app.use('/', express.static(clientApp, { extensions: ['html'] }));

db.connected
    .then(() => {
        console.log('[Server] Successfully connected to MongoDB');
        return db.getRooms();
    })
    .then(rooms => {
        rooms.forEach(room => {
            messages[room._id] = [];  // Initialize an empty array for each room's messages
        });
        app.listen(3000, () => {
            console.log(`[Server] Listening on localhost:${port}, serving ${clientApp}`);
        });
    })
    .catch(error => {
        console.error('[Server] Error initializing chatrooms and messages:', error);
    });

app.get('/chat', (req, res) => {
    db.getRooms()
        .then(rooms => {
            const response = rooms.map(room => ({
                _id: room._id,
                name: room.name,
                image: room.image,
                messages: messages[room._id] || []
            }));
            res.json(response);
        })
        .catch(error => {
            res.status(500).json({ error: 'Failed to fetch rooms' });
        });
});

app.post('/chat', (req, res) => {
    const { name, image } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Room name is required' });
    }

    const newRoom = { name, image: image || 'assets/everyone-icon.png' };

    db.addRoom(newRoom)
        .then(room => {
            messages[room._id] = []; 
            res.status(200).json(room); 
        })
        .catch(error => {
            res.status(500).json({ error: 'Failed to add room' });
        });
});


app.get('/chat/:room_id', (req, res) => {
    const roomId = req.params.room_id;
    db.getRoom(roomId)
        .then(room => {
            if (room) {
                res.json(room);
            } else {
                res.status(404).json({ error: `Room ${roomId} was not found` });
            }
        })
        .catch(error => {
            res.status(500).json({ error: 'Failed to fetch room' });
        });
});

app.get('/chat/:room_id/messages', (req, res) => {
    const roomId = req.params.room_id;
    const before = req.query.before ? parseInt(req.query.before) : Date.now();

    db.getLastConversation(roomId, before)
        .then(conversation => {
            if (conversation) {
                res.json(conversation);
            } else {
                res.status(404).json({ error: 'No conversation found' });
            }
        })
        .catch(error => {
            res.status(500).json({ error: 'Failed to fetch conversation' });
        });
});

// Endpoint to save the language preference

//Receiving 
app.post('/chat/:room_id/language', (req, res) => {
    const { room_id } = req.params;
    const { language } = req.body;

    if (!language || typeof language !== 'string') {
        return res.status(400).json({ error: 'Invalid language input' });
    }

    db.getRoom(room_id)
        .then((room) => {
            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }
            console.log(`Language for room ${room_id} set to: ${language}`);
            res.status(200).json({ message: 'Language preference saved' });
        })
        .catch((error) => {
            console.error('Error saving language preference:', error);
            res.status(500).json({ error: 'Failed to save language preference' });
        });
});

//Sending
// Endpoint to save the language preference
app.post('/chat/:room_id/languageSending', (req, res) => {
    const { room_id } = req.params;
    const { language } = req.body;

    if (!language || typeof language !== 'string') {
        return res.status(400).json({ error: 'Invalid language input' });
    }

    db.getRoom(room_id)
        .then((room) => {
            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }
            console.log(`Sending Language for room ${room_id} set to: ${language}`);
            res.status(200).json({ message: 'Sending Language preference saved' });
        })
        .catch((error) => {
            console.error('Error saving language preference:', error);
            res.status(500).json({ error: 'Failed to save language preference' });
        });
});

// Endpoint to save the translation toggle state

//Recieving 
app.post('/chat/:room_id/translation', (req, res) => {
    const { room_id } = req.params;
    const { translationEnabled } = req.body;

    if (typeof translationEnabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid translation state input' });
    }

    db.getRoom(room_id)
        .then((room) => {
            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }
            console.log(
                `Automatic Translation for room ${room_id} set to: ${
                    translationEnabled ? 'On' : 'Off'
                }`
            );
            res.status(200).json({ message: 'Translation state saved' });
        })
        .catch((error) => {
            console.error('Error saving translation state:', error);
            res.status(500).json({ error: 'Failed to save translation state' });
        });
});

//Recieving 
app.post('/chat/:room_id/translationSending', (req, res) => {
    const { room_id } = req.params;
    const { translationEnabled } = req.body;

    if (typeof translationEnabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid translation state input' });
    }

    db.getRoom(room_id)
        .then((room) => {
            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }
            console.log(
                `Automatic Sending Translation for room ${room_id} set to: ${
                    translationEnabled ? 'On' : 'Off'
                }`
            );
            res.status(200).json({ message: 'Sending Translation state saved' });
        })
        .catch((error) => {
            console.error('Error saving Sending translation state:', error);
            res.status(500).json({ error: 'Failed to save translation state' });
        });
});




const broker = new WebSocket.Server({ port: 8000 });


broker.on('connection', (socket) => {
    console.log('New client connected');
    socket.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            const { roomId, username, text } = message;

            if (messages[roomId]) {
                messages[roomId].push({ username, text });

                if (messages[roomId].length >= messageBlockSize) {
                    const conversation = {
                        room_id: roomId,
                        timestamp: Date.now(),
                        messages: messages[roomId]
                    };

                    db.addConversation(conversation)
                        .then(() => {
                            messages[roomId] = [];  // Clear the message array after saving to database
                        })
                        .catch(error => {
                            console.error('Failed to save conversation:', error);
                        });
                }

                broker.clients.forEach(client => {
                    if (client !== socket && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(message));
                    }
                });
            } else {
                console.error('Invalid roomId:', roomId);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    socket.on('close', () => {
        console.log('Client disconnected');
    });
});



//cpen322.connect('http://3.98.223.41/cpen322/test-a4-server.js');
cpen322.export(__filename, { app, broker });
cpen322.export(__filename, { messages, db, messageBlockSize });
