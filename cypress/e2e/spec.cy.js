it('creates a new room and sends a message', () => {
  cy.visit('http://localhost:3000');

  // Add a new room
  cy.get('input[placeholder="Add a Room"]').type('Test Room');
  cy.contains('Add').click();

  // Click on the new room
  cy.contains('Test Room').click();

  // Type and send a message
  cy.get('textarea[placeholder="Type a message"]').type('Hello world{enter}');

  // Confirm the message is displayed
  cy.contains('Hello world');
});
