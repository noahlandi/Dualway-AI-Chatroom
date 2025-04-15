describe('Lobby Page', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000');
    });
  
    it('displays all default rooms', () => {
      cy.contains('Chat Room 1').should('exist');
      cy.contains('Chat Room 2').should('exist');
      cy.contains('Chat Room 3').should('exist');
    });
  
    it('room list updates after adding a room', () => {
      const roomName = 'Dynamic Room';
      cy.get('input[placeholder="Add a Room"]').type(roomName);
      cy.contains('Add').click();
      cy.contains(roomName).should('exist');
    });
  });
  