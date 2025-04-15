const { MongoClient, ObjectId } = require('mongodb');	// require the mongodb driver

/**
 * Uses mongodb v6.3 - [API Documentation](http://mongodb.github.io/node-mongodb-native/6.3/)
 * Database wraps a mongoDB connection to provide a higher-level abstraction layer
 * for manipulating the objects in our cpen322 app.
 */
function Database(mongoUrl, dbName){
	if (!(this instanceof Database)) return new Database(mongoUrl, dbName);
	this.connected = new Promise((resolve, reject) => {
		const client = new MongoClient(mongoUrl);

		client.connect()
		.then(() => {
			console.log('[MongoClient] Connected to ' + mongoUrl + '/' + dbName);
			resolve(client.db(dbName));
		}, reject);
	});
	this.status = () => this.connected.then(
		db => ({ error: null, url: mongoUrl, db: dbName }),
		err => ({ error: err })
	);
}

Database.prototype.getRooms = function() {
    return this.connected.then(db =>
        new Promise((resolve, reject) => {
            db.collection('chatrooms').find().toArray()
                .then(rooms => resolve(rooms || []))  
                .catch(reject);
        })
    );
};

Database.prototype.getRoom = function(room_id) {
    return this.connected.then(db =>
        new Promise((resolve, reject) => {
            const query = { _id: ObjectId.isValid(room_id) ? new ObjectId(room_id) : room_id };
            db.collection('chatrooms').findOne(query)
                .then(resolve)  
                .catch(reject);
        })
    );
};

Database.prototype.addRoom = function(room) {
    return this.connected.then(db =>
        new Promise((resolve, reject) => {
            if (!room.name) {
                return reject(new Error('Room name is required'));
            }
            db.collection('chatrooms').insertOne(room)
                .then(result => {
                    resolve({
                        _id: result.insertedId,
                        name: room.name,
                        image: room.image || 'assets/everyone-icon.png'
                    });
                })
                .catch(reject);
        })
    );
};

Database.prototype.getLastConversation = function(room_id, before = Date.now()) {
    return this.connected.then(db =>
        new Promise((resolve, reject) => {
            db.collection('conversations')
                .find({ room_id: room_id, timestamp: { $lt: before } })
                .sort({ timestamp: -1 })
                .limit(1)
                .toArray()
                .then(conversations => resolve(conversations[0] || null))  
                .catch(reject);
        })
    );
};

Database.prototype.addConversation = function(conversation) {
    return this.connected.then(db =>
        new Promise((resolve, reject) => {
            if (!conversation.room_id || !conversation.timestamp || !Array.isArray(conversation.messages)) {
                return reject(new Error('room_id, timestamp, and messages are required'));
            }
            db.collection('conversations').insertOne(conversation)
                .then(result => resolve({
                    _id: result.insertedId,
                    room_id: conversation.room_id,
                    timestamp: conversation.timestamp,
                    messages: conversation.messages
                }))
                .catch(reject);
        })
    );
};

module.exports = Database;