/// <reference types="cypress" />

declare global {
    namespace Cypress {
      interface Chainable {
        authenticate(authKey: string): Chainable<void>;
        searchJobs(query: string): Chainable<void>;
        authenticate(authKey: string): Chainable<void>;
        authenticateWithSession(authKey: string): Chainable<void>;
      }
    }
  }

/**
 * Authenticate using the authentication password
 * @param authKey - The authentication password
 */
Cypress.Commands.add("authenticate", (authKey: string) => {
    cy.visit("/login");
    cy.get('[data-cy="password-input-field"]').type(`${authKey}`);
    cy.get('button[type="submit"]').click();
    cy.url().should("not.include", "/login");
  });


/**
 * Authenticate using the authentication password with a session
 * @param authKey - The authentication password
 */
Cypress.Commands.add("authenticateWithSession", (authKey: string) => {
    cy.session(
      [authKey],
      () => {
        cy.visit("/login");
        cy.get('[data-cy="password-input-field"]').type(`${authKey}`);
        cy.get("button[type='submit']").click();
        
        // Wait for auth_token cookie to be set
        cy.getCookie("auth_token").should("exist");
        cy.url().should("not.include", "/login");
      },
      {
        validate: () => {
          // Validate session is still valid by checking cookie exists
          cy.getCookie("auth_token").should("exist");
        },
      }
    );
  });
  
  Cypress.Commands.add("searchJobs", (query: string) => {
    cy.get("input[placeholder*='search']").type(query);
    cy.get("button").contains("Search").click();
    cy.get("[data-testid='job-results']").should("be.visible");
  });
  
  export {};