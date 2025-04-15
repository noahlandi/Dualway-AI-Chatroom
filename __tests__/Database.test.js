const Database = require('../Database');
const { ObjectId } = require('mongodb');

const db = new Database('mongodb://localhost:27017', 'cpen322-messenger');

let testRoomId;

beforeAll(async () => {
  const connectedDb = await db.connected;
  await connectedDb.collection('chatrooms').deleteMany({ name: 'Test Room' });
});

afterAll(async () => {
  const connectedDb = await db.connected;
  await connectedDb.collection('chatrooms').deleteMany({ name: 'Test Room' });
  await connectedDb.client?.close();
});

describe('Database Methods', () => {
  test('getRooms returns an array', async () => {
    const rooms = await db.getRooms();
    expect(Array.isArray(rooms)).toBe(true);
  });

  test('addRoom rejects without a name', async () => {
    await expect(db.addRoom({})).rejects.toThrow('Room name is required');
  });

  test('addRoom inserts room and returns it', async () => {
    const newRoom = await db.addRoom({ name: 'Test Room', image: 'test.png' });
    expect(newRoom).toHaveProperty('_id');
    expect(newRoom.name).toBe('Test Room');
    testRoomId = newRoom._id;
  });

  test('getRoom fetches existing room by id', async () => {
    const room = await db.getRoom(testRoomId);
    expect(room).not.toBeNull();
    expect(room.name).toBe('Test Room');
  });

  test('getRoom returns null for nonexistent room', async () => {
    const result = await db.getRoom(new ObjectId().toString());
    expect(result).toBeNull();
  });

  test('addConversation and getLastConversation', async () => {
    const timestamp = Date.now();
    const messages = [
      { username: 'Alice', text: 'Hi!' },
      { username: 'Bob', text: 'Hello!' },
    ];

    const conversation = await db.addConversation({
      room_id: testRoomId.toString(),
      timestamp,
      messages,
    });

    expect(conversation).toHaveProperty('_id');
    expect(conversation.messages.length).toBe(2);

    const fetched = await db.getLastConversation(testRoomId.toString(), Date.now());
    expect(fetched).not.toBeNull();
    expect(fetched.messages[0].text).toBe('Hi!');
  });
});
