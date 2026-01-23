describe("Homepage", () => {
    beforeEach(() => {
      cy.visit("/");
    });
  
    it("should load the homepage", () => {
      cy.title().should("contain", "Deep Job Researcher");
    });

    /**
     * Tests to validate the initial auth form prior to authentication
     */
    it("should present the authentication form prior to showing the actual app", () => {
        // xpath locator for password input field
        cy.xpath('//*[@id="password"]')
        .should('be.visible')
        .and('have.attr', 'placeholder', 'Password');

        // css selector for password input field
        cy.get('#password').should('be.visible')
        .and('have.attr', 'placeholder', 'Password')
        .and('have.attr', 'type', 'password');

        // data-cy locator for password input field
        cy.get('[data-cy="password-input-field"]').should('be.visible')
        .and('have.attr', 'placeholder', 'Password')
        .and('have.attr', 'type', 'password')
        .and('have.value', '')              // should be empty initially

        cy.get('button[type="submit"]').should('be.visible')
        .and('have.text', 'Sign in');
      });
  });