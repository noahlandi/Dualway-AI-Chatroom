describe('Translation Panel', () => {
    it('toggles automatic translation and sets a language', () => {
      cy.visit('http://localhost:3000');
  
      const roomName = 'Translate Room';
      cy.get('input[placeholder="Add a Room"]').type(roomName);
      cy.contains('Add').click();
      cy.contains(roomName).click();
  
      cy.get('h4.room-name').should('contain.text', roomName);
  
      cy.get('#translation-toggle').check().should('be.checked');
  
      cy.get('#language-input').should('exist').type('Spanish{enter}');
  
      // Wait for confirmation to appear
      cy.get('.language-confirmation').should('contain.text', 'Language set to: Spanish');
    });
  });
  