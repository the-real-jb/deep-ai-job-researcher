describe('Resume upload flow', () => {
  beforeEach(() => {
    cy.fixture('resume-analysis-success.json').as('resumeAnalysisSuccess');
  });

  beforeEach(() => {
    const authPassword = Cypress.env('AUTH_PASSWORD');

    // establish a session with the authentication password
    cy.authenticateWithSession(authPassword);
    cy.visit('/');
  });

  it('shows a validation error for non-PDF files', () => {
    cy.get('[data-cy="mode-toggle-resume"]').should('be.visible').click();
    cy.get('[data-cy="resume-upload-input"]').should('exist');
    
    cy.get('[data-cy="resume-upload-input"]').selectFile(
      'cypress/fixtures/test-resume.txt',
      { force: true }
    );

    cy.contains('File must be a PDF').should('be.visible');
  });

  describe('uploading a PDF and triggering analysis with a mocked resume that returns 1 match', () => {
    beforeEach(() => {
      cy.get('@resumeAnalysisSuccess').then((response) => {
      cy.intercept('POST', '/api/analyze/resume', {
        statusCode: 200,
          body: response
      }).as('analyzeResume');
      });

      // click the mode toggle button
      cy.get('[data-cy="mode-toggle-resume"]').click();
      cy.get('[data-cy="resume-upload-input"]').should('exist');
      cy.get('[data-cy="resume-upload-input"]').selectFile(
        'cypress/fixtures/test-resume.pdf',
        { force: true }
      );

      cy.get('[data-cy="resume-upload-filename"]').should('have.text', 'test-resume.pdf');
      cy.get('[data-cy="resume-upload-analyze"]').click();
      
      // wait for the analyze resume mocked API call to complete
      cy.wait('@analyzeResume');
    });

    it('verifies the job match table is visible and contains the correct number of matches', () => {
      
      // pause the test if the DEMO_PAUSE environment variable is set
      if (Cypress.env('DEMO_PAUSE')) {
        cy.pause();
      }

      cy.get('[data-cy="job-match-table"]').should('be.visible');
      cy.get('[data-cy="job-match-table-title"]').should('contain', 'Job Matches (1)');
      cy.contains('Export Results').should('be.visible');
    });

    it('shows the mocked match elements', () => {
      
      // pause the test if the DEMO_PAUSE environment variable is set
      if (Cypress.env('DEMO_PAUSE')) {
        cy.pause();
      }

      // verify the job match table is visible and check the elements within the job match 0
      cy.get('[data-cy="job-match-0"]').within(() => {
        cy.get('[data-cy="job-match-title"]').should('have.text', 'Senior QA Engineer');
        cy.get('[data-cy="job-match-company"]').should('have.text', 'Awesome Inc');
        cy.get('[data-cy="job-match-score"]').should('have.text', '95');
        cy.get('[data-cy="job-match-source"]').should('contain', 'Work at a Startup (Mock)');
        cy.get('[data-cy="job-match-pitch"]').should(
          'have.text',
          'Strong Cypress experience with JavaScript and Postman, but missing C++ experience.'
        );

        // validate the job match link
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
