describe('Chatroom Frontend', () => {
    it('creates a new room, navigates to it, and sends a message', () => {
      const roomName = 'Test Room';
      const message = 'Hello from Cypress!';
  
      cy.visit('http://localhost:3000');
  
      cy.get('input[placeholder="Add a Room"]').type(roomName);
      cy.contains('Add').click();
  
      cy.contains('a', roomName, { timeout: 8000 }).should('exist');
  
      cy.contains('a', roomName).as('roomLink');
  
      cy.get('@roomLink').click();
  
      cy.url().should('include', '/chat');
  
      cy.get('textarea[placeholder="Type a message"]', { timeout: 6000 }).should('exist');
      cy.get('textarea[placeholder="Type a message"]').type(message + '{enter}');
  
      cy.contains(message).should('exist');
    });
  });
  