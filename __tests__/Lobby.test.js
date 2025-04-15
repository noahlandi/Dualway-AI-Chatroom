class Room {
    constructor(id, name, image = 'assets/everyone-icon.png', messages = []) {
      this.id = id;
      this.name = name;
      this.image = image;
      this.messages = messages;
    }
  }
  
  class Lobby {
    constructor() {
      this.rooms = {};
      this.onNewRoom = null;
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
  
  describe('Lobby class', () => {
    let lobby;
  
    beforeEach(() => {
      lobby = new Lobby();
    });
  
    test('adds a room and retrieves it', () => {
      lobby.addRoom('room-42', 'Cool Room');
      const room = lobby.getRoom('room-42');
      expect(room).not.toBeNull();
      expect(room.name).toBe('Cool Room');
    });
  
    test('does not overwrite existing room', () => {
      lobby.addRoom('room-1', 'First Room');
      lobby.addRoom('room-1', 'Updated Room');
      expect(lobby.getRoom('room-1').name).toBe('First Room'); // should not overwrite
    });
  
    test('calls onNewRoom callback when a room is added', () => {
      const mockCallback = jest.fn();
      lobby.onNewRoom = mockCallback;
  
      lobby.addRoom('room-99', 'Callback Room');
  
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback.mock.calls[0][0].name).toBe('Callback Room');
    });
  
    test('returns null if room not found', () => {
      const result = lobby.getRoom('nonexistent-room');
      expect(result).toBeNull();
    });
  });
  