import { LoginPage } from '../../support/pom_pages';

describe('Login flow (POM)', () => {
  const loginPage = new LoginPage();

  it('logs in with the auth password', () => {
    const authPassword = Cypress.env('AUTH_PASSWORD');

    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: { success: true }
    }).as('authLogin');

    loginPage
      .visit()
      .expectHeader('Authentication Required')
      .fillPassword(authPassword)
      .submit();

    cy.wait('@authLogin');
    // cy.url().should('not.include', '/login');
  });
});
