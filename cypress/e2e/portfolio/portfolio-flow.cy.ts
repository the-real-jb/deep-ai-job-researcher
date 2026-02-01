describe('Portfolio analysis flow', () => {
  beforeEach(() => {
    const authPassword = Cypress.env('AUTH_PASSWORD');
    cy.authenticateWithSession(authPassword);
    cy.visit('/');
    cy.get('[data-cy="mode-toggle-portfolio"]').should('be.visible').click();
  });

  it('shows validation error for invalid URL', () => {
    cy.get('[data-cy="portfolio-url-input"]').type('not-a-url');
    cy.get('[data-cy="portfolio-analyze"]').click();
    cy.get('[data-cy="portfolio-url-error"]').should('contain', 'Please enter a valid URL');
  });

  it('shows multiple matches from portfolio analysis', () => {
    cy.fixture('portfolio-analysis-success.json').then((response) => {
      cy.intercept('POST', '/api/analyze/portfolio', {
        statusCode: 200,
        body: response
      }).as('analyzePortfolio');
    });

    cy.get('[data-cy="portfolio-url-input"]').type('https://example.com/portfolio');
    cy.get('[data-cy="portfolio-analyze"]').click();

    cy.wait('@analyzePortfolio');
    cy.get('[data-cy="job-match-table-title"]').should('contain', 'Job Matches (2)');
    cy.get('[data-cy="job-match-0"]').should('be.visible');
    cy.get('[data-cy="job-match-1"]').should('be.visible');
  });
});
