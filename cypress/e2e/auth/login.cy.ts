describe("Initial authentication process", () => {
    it("should authenticate using the authentication password", () => {
        const authPassword = Cypress.env('AUTH_PASSWORD');
        cy.authenticate(authPassword);
    });
});