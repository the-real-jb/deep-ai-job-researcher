describe('Resume upload flow', () => {
  beforeEach(() => {
    cy.fixture('resume-analysis-success.json').as('resumeAnalysisSuccess');
  });

  beforeEach(() => {
    const authPassword = Cypress.env('AUTH_PASSWORD');
    cy.authenticateWithSession(authPassword);
    cy.visit('/');
  });

  it('shows a validation error for non-PDF files', () => {
    cy.get('[data-cy="mode-toggle-resume"]').click();
    cy.get('[data-cy="resume-upload-input"]').should('exist');
    cy.get('[data-cy="resume-upload-input"]').selectFile(
      'cypress/fixtures/test-resume.txt',
      { force: true }
    );

    cy.contains('File must be a PDF').should('be.visible');
  });

  describe('with a mocked resume upload', () => {
    beforeEach(() => {
      cy.get('@resumeAnalysisSuccess').then((response) => {
        cy.intercept('POST', '/api/analyze/resume', {
          statusCode: 200,
          body: response
        }).as('analyzeResume');
      });

      cy.get('[data-cy="mode-toggle-resume"]').click();
      cy.get('[data-cy="resume-upload-input"]').should('exist');
      cy.get('[data-cy="resume-upload-input"]').selectFile(
        'cypress/fixtures/test-resume.pdf',
        { force: true }
      );

      cy.get('[data-cy="resume-upload-filename"]').should('have.text', 'test-resume.pdf');
      cy.get('[data-cy="resume-upload-analyze"]').click();
      cy.wait('@analyzeResume');
    });

    it('uploads a PDF and triggers analysis', () => {
      if (Cypress.env('DEMO_PAUSE')) {
        cy.pause();
      }

      cy.get('[data-cy="job-match-table"]').should('be.visible');
      cy.get('[data-cy="job-match-table-title"]').should('contain', 'Job Matches (1)');
      cy.contains('Export Results').should('be.visible');
    });

    it('shows the mocked match elements', () => {
      if (Cypress.env('DEMO_PAUSE')) {
        cy.pause();
      }

      cy.get('[data-cy="job-match-0"]').within(() => {
        cy.get('[data-cy="job-match-title"]').should('have.text', 'Senior QA Engineer');
        cy.get('[data-cy="job-match-company"]').should('have.text', 'Awesome Inc');
        cy.get('[data-cy="job-match-score"]').should('have.text', '95');
        cy.get('[data-cy="job-match-source"]').should('contain', 'Work at a Startup (Mock)');
        cy.get('[data-cy="job-match-pitch"]').should(
          'have.text',
          'Strong Cypress experience with JavaScript and Postman, but missing C++ experience.'
        );
        cy.get('[data-cy="job-match-link"]').should(
          'have.attr',
          'href',
          'https://example.com/jobs/senior-qa-engineer'
        );
      });
    });
  });

  it('shows multiple matches from the resume analysis', () => {
    cy.fixture('resume-analysis-multi.json').then((response) => {
      cy.intercept('POST', '/api/analyze/resume', {
        statusCode: 200,
        body: response
      }).as('analyzeResumeMulti');
    });

    cy.get('[data-cy="mode-toggle-resume"]').click();
    cy.get('[data-cy="resume-upload-input"]').selectFile(
      'cypress/fixtures/test-resume.pdf',
      { force: true }
    );
    cy.get('[data-cy="resume-upload-analyze"]').click();

    cy.wait('@analyzeResumeMulti');
    cy.get('[data-cy="job-match-table-title"]').should('contain', 'Job Matches (3)');
    cy.get('[data-cy="job-match-0"]').should('be.visible');
    cy.get('[data-cy="job-match-1"]').should('be.visible');
    cy.get('[data-cy="job-match-2"]').should('be.visible');
  });

  it('shows an error when no jobs are found', () => {
    cy.fixture('resume-analysis-empty.json').then((response) => {
      cy.intercept('POST', '/api/analyze/resume', {
        statusCode: 404,
        body: response
      }).as('analyzeResumeEmpty');
    });

    cy.get('[data-cy="mode-toggle-resume"]').click();
    cy.get('[data-cy="resume-upload-input"]').selectFile(
      'cypress/fixtures/test-resume.pdf',
      { force: true }
    );
    cy.get('[data-cy="resume-upload-analyze"]').click();

    cy.wait('@analyzeResumeEmpty');
    if (Cypress.env('DEMO_PAUSE')) {
      cy.pause();
    }

    cy.contains('Analysis Failed').should('be.visible');
    cy.contains('No jobs found during crawl').should('be.visible');
  });



});
