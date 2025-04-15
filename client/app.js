// Global Variables
var profile = {
    username: 'Mario'  // Arbitrary name for the current user
};

var Service = {
    origin: "http://localhost:3000",
    getAllRooms: function() {
        return fetch(Service.origin + "/chat")
            .then(response => {
                if (!response.ok) {
                    //Server side error
                    return response.text().then(err => {
                        throw new Error(err || 'Server error');
                    })
                }
                return response.json();  //return json if 200
            })
            .catch(err => {
                //client side error
                return Promise.reject(err);
            });
    },

    addRoom: function(data) {
        return fetch(Service.origin + "/chat", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(err => {
                    throw new Error(err || 'Server error');
                });
            }
            return response.json(); 
        })
        .catch(err => {
            console.error("Error adding room:", err);
            throw err;
        });
    },

    getLastConversation: function(roomId, before) {
        const url = `${Service.origin}/chat/${roomId}/messages${before ? `?before=${before}` : ''}`;
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(err => {
                        throw new Error(err || 'Failed to fetch conversation');
                    });
                }
                return response.json();
            });
    }
};

function initializeApp() {
    axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello!' }
        ],
        max_tokens: 50,
    }, {
        headers: {
            'Content-Type': 'application/json',
        }
    }).then(response => {
        console.log('Response:', response.data);
    }).catch(error => {
        console.error('Error:', error);
    });
}

initializeApp();


function* makeConversationLoader(room) {
    let lastTimestamp = room.messages.length > 0 ? room.messages[0].timestamp : Date.now();

    while (true) {
        if (!room.canLoadConversation) return;

        room.canLoadConversation = false;

        const conversationPromise = Service.getLastConversation(room.id, lastTimestamp);
        const conversation = yield conversationPromise;

        if (conversation) {

            
            lastTimestamp = conversation.timestamp - 1;
            room.addConversation(conversation);
            room.canLoadConversation = true; 
        } else {
            room.canLoadConversation = false;
            return;
        }
    }
}

async function translateText(text, targetLanguage) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo-0125',
                messages: [
                    { role: 'system', content: `You are a helpful assistant that translates text to ${targetLanguage}. 
                                                You do not add any other characters apart from the translated text.` },
                    { role: 'user', content: `Translate the following text to ${targetLanguage}: "${text}". Do not add any other characters apart from the translated text, not even quotes.` },
                ],
                max_tokens: 100,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const translation = response.data.choices[0].message.content.trim();
        console.log('Translation:', translation);
        return translation;
    } catch (error) {
        console.error('Error translating text:', error.response?.data || error.message);
        return "Error Translating, Original Text: " + text; // Return original text on error
    }
}





////////////////////////////////////////////HELPERS/////////////////////////////////////////////////

// Removes the contents of the given DOM element (equivalent to elem.innerHTML = '' but faster)
function emptyDOM (elem){
    while (elem.firstChild) elem.removeChild(elem.firstChild);
}

// Creates a DOM element from the given HTML string
function createDOM (htmlString){
    let template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    return template.content.firstChild;
}

// example usage
var messageBox = createDOM(
    `<div>
        <span>Alice</span>
        <span>Hello World</span>
    </div>`
    );

///////////////////////////////////////////////////////////////////////////////////////////////////

function main() {

    //Websocket
    var socket = new WebSocket('ws://localhost:8000');

    //listens for messages and adds them
    socket.addEventListener('message', (event) => {
        try {
            const messageData = JSON.parse(event.data);
            const { roomId, username, text } = messageData;
    
            const room = lobby.getRoom(roomId);
            if (room) {
                room.addMessage(username, text);
            }
        } catch (error) {
            console.error("Error parsing WebSocket message:", error);
        }
    });



    // Create the "single source of truth" lobby object
    var lobby = new Lobby();  // This will be the centralized model

    // Instantiate the view objects
    var lobbyView = new LobbyView(lobby);
    var chatView = new ChatView(socket);
    var profileView = new ProfileView();

    //refresh lobby function
    function refreshLobby() {
        Service.getAllRooms()
            .then(roomList => {
                roomList.forEach(roomData => {
                    let room = lobby.rooms[roomData._id]; 
                    if (room) {
                        
                        room.name = roomData.name;
                        room.image = roomData.image;
                    } else {
                        
                        lobby.addRoom(roomData._id, roomData.name, roomData.image, roomData.messages || []);
                    }
                });
            })
            .catch(error => {
                console.error("Error fetching rooms:", error);
            });
    }

    window.addEventListener("load", refreshLobby);

    setInterval(refreshLobby, 5000);

    refreshLobby();

    function renderRoute() {
        var hash = window.location.hash.substr(1);
        var pathParts = hash.split('/');
        var firstPart = pathParts[1] || '';
    
        var pageView = document.getElementById('page-view');
        emptyDOM(pageView);
    
        var view;
        if (firstPart === '') {
            view = lobbyView;
        } else if (firstPart === 'chat') {
            var roomId = pathParts[2];
            var room = lobby.getRoom(roomId);
    
            if (room) {
                chatView.setRoom(room);
                view = chatView;
            } else {
                view = lobbyView;
            }
    
        } else if (firstPart === 'profile') {
            view = profileView;
        } else {
            view = lobbyView;
        }
    
        pageView.appendChild(view.elem);
    }

    window.addEventListener('popstate', renderRoute)

    renderRoute();

    //testing
    
}

// Add main as the event handler for the window load event
window.addEventListener("load", main);


class LobbyView {
    constructor(lobby) {

        this.lobby = lobby;

        let template = document.getElementById('lobby-page');
        this.elem = createDOM(template.innerHTML);

        this.listElem = this.elem.querySelector('ul.room-list'); // ul for the room list
        this.inputElem = this.elem.querySelector('input[type="text"]'); // input for new room name
        this.buttonElem = this.elem.querySelector('button'); // button for creating a room

        this.redrawList();

        this.rooms = {};


        this.buttonElem.addEventListener('click', () => {
            const roomName = this.inputElem.value.trim();
            
            if (roomName) {
                 
                const data = { name: roomName, image: 'assets/everyone-icon.png' };
        
                // call Service.addRoom to create the room on the server
                Service.addRoom(data)
                .then(newRoom => {
                    // If the room was successfully created, add it to the lobby
                    this.lobby.addRoom(newRoom._id, newRoom.name, newRoom.image); // Use newRoom._id
                    this.inputElem.value = ''; 

                    // Redirect to the new room with the correct ID
                    window.location.hash = `#/chat/${newRoom._id}`; // Use newRoom._id here as well
                })
                .catch(error => {
                    console.error("Error creating room:", error);
                });
                        }
        });
        

        this.lobby.onNewRoom = (room) => {
            this.redrawList();
        };


    }

    // Method to dynamically redraw the room list
    redrawList() {
        // Clear the current list
        this.listElem.innerHTML = '';
    
        // Loop through the rooms in the lobby and add them to the UI
        for (let roomId in this.lobby.rooms) {
            let room = this.lobby.rooms[roomId];
    
            let listItem = document.createElement('li');
            listItem.innerHTML = `
                <img src="${room.image || 'assets/everyone-icon.png'}" alt="Room Icon">
                <a href="#/chat/${roomId}">${room.name}</a>
            `;
            this.listElem.appendChild(listItem);
        }
    }
}

class ChatView {

    constructor(socket) {

        this.socket = socket;  // store the WebSocket reference

        let template = document.getElementById('chat-page');
        this.elem = createDOM(template.innerHTML);

        this.titleElem = this.elem.querySelector('h4.room-name'); // h4 for room name
        this.chatElem = this.elem.querySelector('div.message-list'); // div for message list
        this.inputElem = this.elem.querySelector('textarea'); // textarea for entering the message
        this.buttonElem = this.elem.querySelector('button'); // button for sending the message
        this.room = null;
        this.originalMessages = [];
        this.translatedMessages = [];





        const translationPanel = document.createElement('div');
        translationPanel.classList.add('translation-panel');
        translationPanel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
            <!-- Receiving Panel -->
            <div class="translation-section">
                <label>
                    <input type="checkbox" id="translation-toggle">
                    Automatic Translation (Receiving)
                </label>
                <div class="language-input-container">
                    <label for="language-input" class="language-label">Receiving Language:</label>
                    <input type="text" id="language-input" placeholder="e.g., French, Spanish" />
                </div>
            </div>

            <!-- Image in the Middle -->
            <div class="translation-image">
                <img src="assets/language2.webp" alt="Translate Icon" />
            </div>

            <!-- Sending Panel -->
            <div class="translation-section">
                <label>
                    <input type="checkbox" id="translation-toggle-sending">
                    Translate Sent Messages
                </label>
                <div class="language-input-container">
                    <label for="language-input-sending" class="language-label">Sending Language:</label>
                    <input type="text" id="language-input-sending" placeholder="e.g., French, Spanish" />
                </div>
            </div>
        </div>
    `;

    
        this.elem.insertBefore(translationPanel, this.chatElem);

        this.translationToggle = translationPanel.querySelector('#translation-toggle');
        this.languageInput = translationPanel.querySelector('#language-input');


        this.translationToggleSending = translationPanel.querySelector('#translation-toggle-sending');
        this.languageInputSending = translationPanel.querySelector('#language-input-sending');

        // Default States
        this.isTranslationOn = false;
        this.selectedLanguage = '';

        this.isTranslationOnSending = false;
        this.selectedLanguageSending = '';

        //Recieving 
        this.translationToggle.addEventListener('change', (event) => {
            this.isTranslationOn = event.target.checked;
            console.log(`Automatic Translation: ${this.isTranslationOn ? 'On' : 'Off'}`);
            this.sendTranslationState(); // Send toggle state to the server
        });

        //Sending
        this.translationToggleSending.addEventListener('change', (event) => {
            this.isTranslationOnSending = event.target.checked;
            console.log(`Automatic Translation: ${this.isTranslationOnSending ? 'On' : 'Off'}`);
            this.sendTranslationStateSending(); // Send toggle state to the server
        });

        //Receiving
        this.languageInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                const language = event.target.value.trim(); // Get the entered language
                if (language) {
                    this.selectedLanguage = language; // Save the language
                    this.sendLanguagePreference(language); // Send language to the server
        
                    // Indicate confirmation by changing background and removing focus
                    this.languageInput.blur(); // Remove the text cursor (blur the input field)
        
                    // Display a small confirmation message below the input
                    let confirmationMessage = this.languageInput.nextSibling;
                    if (!confirmationMessage || !confirmationMessage.classList.contains('language-confirmation')) {
                        confirmationMessage = document.createElement('div');
                        confirmationMessage.classList.add('language-confirmation');
                        confirmationMessage.innerText = `Language set to: ${language}`;
                        confirmationMessage.style.color = 'green';
                        confirmationMessage.style.marginTop = '5px';
                        this.languageInput.parentNode.appendChild(confirmationMessage);
                    } else {
                        confirmationMessage.innerText = `Language set to: ${language}`; // Update the message
                    }
        
                    // Reset the background color after 2 seconds
                    setTimeout(() => {
                        this.languageInput.style.backgroundColor = ''; // Reset to default background
                    }, 2000); // 2 seconds
                }
            }
        });

        //Sending
        this.languageInputSending.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                const language = event.target.value.trim(); // Get the entered language
                if (language) {
                    this.selectedLanguageSending = language; // Save the language
                    this.sendLanguagePreferenceSending(language); // Send language to the server
        
                    // Indicate confirmation by changing background and removing focus
                    this.languageInputSending.blur(); // Remove the text cursor (blur the input field)
        
                    // Display a small confirmation message below the input
                    let confirmationMessage = this.languageInputSending.nextSibling;
                    if (!confirmationMessage || !confirmationMessage.classList.contains('language-confirmation')) {
                        confirmationMessage = document.createElement('div');
                        confirmationMessage.classList.add('language-confirmation');
                        confirmationMessage.innerText = `Language set to: ${language}`;
                        confirmationMessage.style.color = 'green';
                        confirmationMessage.style.marginTop = '5px';
                        this.languageInputSending.parentNode.appendChild(confirmationMessage);
                    } else {
                        confirmationMessage.innerText = `Language set to: ${language}`; // Update the message
                    }
        
                    // Reset the background color after 2 seconds
                    setTimeout(() => {
                        this.languageInputSending.style.backgroundColor = ''; // Reset to default background
                    }, 2000); // 2 seconds
                }
            }
        });
        
        //Receiving
        this.translationToggle.addEventListener('change', (event) => {
            this.isTranslationOn = event.target.checked;
            console.log(`Automatic Translation: ${this.isTranslationOn ? 'On' : 'Off'}`);
        
            if (this.isTranslationOn) {
                this.reloadMessagesWithTranslation();
            } else {
                this.setRoom(this.room); // Reload the room with original messages
            }
        });

        //Sending
        this.translationToggleSending.addEventListener('change', (event) => {
            this.isTranslationOnSending = event.target.checked;
            console.log(`Automatic Translation: ${this.isTranslationOnSending ? 'On' : 'Off'}`);
        
            
        });

        //Receiving
        this.languageInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                this.selectedLanguage = event.target.value.trim();
                if (this.selectedLanguage && this.isTranslationOn) {
                    this.reloadMessagesWithTranslation();
                }
            }
        });

        //Sending
        this.languageInputSending.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                this.selectedLanguageSending = event.target.value.trim();
                
            }
        });

        //Receiving
        this.languageInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                this.selectedLanguage = event.target.value.trim();
                if (this.selectedLanguage) {
                    console.log(`Language selected: ${this.selectedLanguage}`);
                    this.sendLanguagePreference(); // Send language to the server
                }
            }
        });

        //Sending
        this.languageInputSending.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                this.selectedLanguageSending = event.target.value.trim();
                if (this.selectedLanguageSending) {
                    console.log(`Sending Language selected: ${this.selectedLanguageSending}`);
                    this.sendLanguagePreferenceSending(); // Send language to the server
                }
            }
        });


        //Non Translation


        // Attach click event handler to the button to send messages
        this.buttonElem.addEventListener('click', () => {
            this.sendMessage();
        });

        //infinite scrolling event
        this.chatElem.addEventListener('wheel', async (event) => {
            if (this.chatElem.scrollTop === 0 && event.deltaY < 0 && this.room.canLoadConversation) {
                const conversation = await this.room.getLastConversation.next().value;
                if (conversation && this.isTranslationOn && this.selectedLanguage) {
                    const translatedMessages = await Promise.all(
                        conversation.messages.map(async (message) => {
                            const translatedText = await translateText(message.text, this.selectedLanguage);
                            return { ...message, text: translatedText };
                        })
                    );
                    translatedMessages.forEach((message) => this.addMessageToChat(message, true));
                } else if (conversation) {
                    conversation.messages.forEach((message) => this.addMessageToChat(message, true));
                }
            }
        });
        
        

        // Attach keyup event handler to send message when Enter key is pressed
        this.inputElem.addEventListener('keyup', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();  // Prevent default behavior (like line breaks)
                this.sendMessage();
            }
        });


        //Non Translation
    }

    resetTranslationSettings() {
        this.isTranslationOn = false; // Reset toggle
        this.selectedLanguage = ''; // Reset language input
        this.translationToggle.checked = false; // Uncheck the toggle
        this.languageInput.value = ''; // Clear the input field

        this.isTranslationOnSending = false; // Reset toggle
        this.selectedLanguageSending = ''; // Reset language input
        this.translationToggleSending.checked = false; // Uncheck the toggle
        this.languageInputSending.value = ''; // Clear the input field
    }

    //Receiving 
    sendLanguagePreference() {
        if (this.room && this.room.id) {
            const payload = { roomId: this.room.id, language: this.selectedLanguage };
            fetch(`${Service.origin}/chat/${this.room.id}/language`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Failed to save language preference');
                    }
                    return response.json();
                })
                .then((data) => {
                    console.log('Language preference saved:', data);
                })
                .catch((error) => {
                    console.error('Error saving language preference:', error);
                });
        }
    }

    //Sending 
    sendLanguagePreferenceSending() {
        if (this.room && this.room.id) {
            const payload = { roomId: this.room.id, language: this.selectedLanguageSending };
            fetch(`${Service.origin}/chat/${this.room.id}/languageSending`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Failed to save language preference - sending');
                    }
                    return response.json();
                })
                .then((data) => {
                    console.log('Language preference sending saved:', data);
                })
                .catch((error) => {
                    console.error('Error saving sending language preference:', error);
                });
        }
    }

    //Receiving 
    sendTranslationState() {
        if (this.room && this.room.id) {
            const payload = { roomId: this.room.id, translationEnabled: this.isTranslationOn };
            fetch(`${Service.origin}/chat/${this.room.id}/translation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Failed to save translation toggle state');
                    }
                    return response.json();
                })
                .then((data) => {
                    console.log('Translation state saved:', data);
                })
                .catch((error) => {
                    console.error('Error saving translation state:', error);
                });
        }
    }

    //Sending
    sendTranslationStateSending() {
        if (this.room && this.room.id) {
            const payload = { roomId: this.room.id, translationEnabled: this.isTranslationOnSending };
            fetch(`${Service.origin}/chat/${this.room.id}/translationSending`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Failed to save translation toggle state');
                    }
                    return response.json();
                })
                .then((data) => {
                    console.log('Translation state saved:', data);
                })
                .catch((error) => {
                    console.error('Error saving translation state:', error);
                });
        }
    }

    // Method to send a message
    async sendMessage() {
        const messageText = this.inputElem.value.trim();
        const messageText2 = await translateText(messageText, this.selectedLanguageSending);

        if (messageText !== '' && this.room) {

            if (this.isTranslationOnSending) {
                this.room.addMessage(profile.username, messageText2);
            }

            // Add the message to the current room
            else { 
                this.room.addMessage(profile.username, messageText);
            }

            // Clear the input field
            this.inputElem.value = '';
        }

        //make a json object
        const messageData = {
            roomId: this.room.id,
            username: profile.username,
            text: messageText
        };

        const messageData2 = {
            roomId: this.room.id,
            username: profile.username,
            text: messageText2
        };

        // send as json string
        if (this.isTranslationOnSending) {
            this.socket.send(JSON.stringify(messageData2));
        }

        else {
            this.socket.send(JSON.stringify(messageData));
        }
    }

    setRoom(room) {
        this.room = room;
    
        this.resetTranslationSettings();
    
        // Callback for when a new conversation is fetched
        this.room.onFetchConversation = async (conversation) => {
            const previousScrollHeight = this.chatElem.scrollHeight;
    
            // Translate messages if translation is enabled
            if (this.isTranslationOn && this.selectedLanguage) {
                const translatedMessages = await Promise.all(
                    conversation.messages.map(async (message) => {
                        const translatedText = await translateText(message.text, this.selectedLanguage);
                        return { ...message, text: translatedText };
                    })
                );
                translatedMessages.forEach((message) => this.addMessageToChat(message, true));
            } else {
                conversation.messages.forEach((message) => this.addMessageToChat(message, true));
            }
    
            // Adjust scroll position to avoid jumping
            const newScrollHeight = this.chatElem.scrollHeight;
            this.chatElem.scrollTop = newScrollHeight - previousScrollHeight;
        };
    
        this.titleElem.innerText = room.name;
        this.chatElem.innerHTML = '';
    
        // Load recent messages from the database upon setting the room
        const loadInitialMessages = async () => {
            try {
                const conversation = await Service.getLastConversation(room.id);
                if (conversation) {
                    room.addConversation(conversation);
                }
            } catch (error) {
                console.error("Error loading initial messages:", error);
            }
        };
        loadInitialMessages();
    
        // Display existing messages in the room
        const loadMessages = async () => {
            if (this.isTranslationOn && this.selectedLanguage) {
                const translatedMessages = await Promise.all(
                    room.messages.map(async (message) => {
                        const translatedText = await translateText(message.text, this.selectedLanguage);
                        return { ...message, text: translatedText };
                    })
                );
                translatedMessages.forEach((message) => this.addMessageToChat(message));
            } else {
                room.messages.forEach((message) => this.addMessageToChat(message));
            }
        };
        loadMessages();
    
        // Handle new messages in the room
        this.room.onNewMessage = async (message) => {
            if (this.isTranslationOn && this.selectedLanguage) {
                const translatedText = await translateText(message.text, this.selectedLanguage);
                this.addMessageToChat({ ...message, text: translatedText });
            } else {
                this.addMessageToChat(message);
            }
        };
    }
    
    

    // Method to add a message to the chat view
    addMessageToChat(message, atStart = false) {
        const messageElem = document.createElement('div');
        messageElem.classList.add('message');
        if (message.username === profile.username) {
            messageElem.classList.add('my-message');
        }
        messageElem.innerHTML = `
            <div class="message-user">${message.username}</div>
            <div class="message-text">${message.text}</div>
            <div class="message-timestamp">${new Date().toLocaleTimeString()}</div>
        `;
    
        if (atStart) {
            this.chatElem.insertBefore(messageElem, this.chatElem.firstChild);
        } else {
            this.chatElem.appendChild(messageElem);
        }
    }









    async reloadMessagesWithTranslation() {
        if (!this.room || !this.selectedLanguage) {
            console.warn("No room selected or no language specified for translation.");
            return;
        }
    
        try {
            // Translate all messages in the room
            const translatedMessages = await Promise.all(
                this.room.messages.map(async (message) => {
                    const translatedText = await translateText(message.text, this.selectedLanguage);
                    return { ...message, text: translatedText }; // Keep all original message properties
                })
            );
    
            // Clear current messages in the chat view
            this.chatElem.innerHTML = '';
    
            // Add translated messages to the chat view
            translatedMessages.forEach((message) => this.addMessageToChat(message));
            console.log("Messages reloaded in translated language:", this.selectedLanguage);
        } catch (error) {
            console.error("Error reloading messages with translation:", error);
        }
    }

    
    

}

class ProfileView {
    constructor() {
        let template = document.getElementById('profile-page');
        this.elem = createDOM(template.innerHTML);
    }
}

class Room {
    constructor(id, name, image = 'assets/everyone-icon.png', messages = []) {
        this.id = id;
        this.name = name;
        this.image = image;
        this.messages = messages;
        this.canLoadConversation = true;
        this.getLastConversation = makeConversationLoader(this);
    }

    //add message function
    addMessage(username, text) {
        if (text.trim() === '') {
            return;  // Ignore empty or whitespace messages
        }

        // Create a new message object
        const message = { username: username, text: text };
        // Push the message into the messages array
        this.messages.push(message);

        // Check if onNewMessage is defined and call it
        if (typeof this.onNewMessage === 'function') {
            this.onNewMessage(message);  // Notify listeners about the new message
        }
    }

    addConversation(conversation) {
        this.messages = [...conversation.messages, ...this.messages];
    
        if (typeof this.onFetchConversation === 'function') {
            this.onFetchConversation(conversation);
        }
    }
}


class Lobby {
    constructor() {
        this.rooms = {
            "room-1": new Room("room-1", "Chat Room 1"),
            "room-2": new Room("room-2", "Chat Room 2"),
            "room-3": new Room("room-3", "Chat Room 3"),
            "room-4": new Room("room-4", "General Room")
        };

        this.nextRoomId = 5;  // Next room ID number
        this.onNewRoom = null;
    }

    createRoom(name, image = 'assets/everyone-icon.png', messages = []) {
        const roomId = `room-${this.nextRoomId++}`;
        this.addRoom(roomId, name, image, messages);
        return roomId;
    }

    addRoom(roomId, name, image = 'assets/everyone-icon.png', messages = []) {
        if (!this.rooms[roomId]) {
            this.rooms[roomId] = new Room(roomId, name, image, messages);

            if (typeof this.onNewRoom === 'function') {
                this.onNewRoom(this.rooms[roomId]);
            }
        }
    }

    getRoom(roomId) {
        return this.rooms[roomId] || null;
    }
}


/*We used chatgpt to help us with js-specific language, syntax and features throughout this js file*/

