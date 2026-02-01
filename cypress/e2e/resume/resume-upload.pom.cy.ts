import { JobMatchTable, ResumePage } from '../../support/pom_pages';

describe('Resume upload flow (POM)', () => {
  const resumePage = new ResumePage();
  const matchTable = new JobMatchTable();

  beforeEach(() => {
    const authPassword = Cypress.env('AUTH_PASSWORD');
    cy.authenticateWithSession(authPassword);
    resumePage.visit().selectResumeMode();
    cy.fixture('resume-analysis-success.json').as('resumeAnalysisSuccess');
  });

  it('uploads a resume via POM', () => {
    cy.get('@resumeAnalysisSuccess').then((response) => {
      cy.intercept('POST', '/api/analyze/resume', {
        statusCode: 200,
        body: response
      }).as('analyzeResume');
    });

    resumePage
      .uploadResumeFixture('cypress/fixtures/test-resume.pdf')
      .expectUploadedFileName('test-resume.pdf')
      .analyzeResume();

    cy.wait('@analyzeResume');
    if (Cypress.env('DEMO_PAUSE')) {
      cy.pause();
    }
    matchTable.expectVisible().expectTitleCount(1);
  });

  it('validates mocked match elements via POM', () => {
    cy.get('@resumeAnalysisSuccess').then((response) => {
      cy.intercept('POST', '/api/analyze/resume', {
        statusCode: 200,
        body: response
      }).as('analyzeResume');
    });

    resumePage
      .uploadResumeFixture('cypress/fixtures/test-resume.pdf')
      .expectUploadedFileName('test-resume.pdf')
      .analyzeResume();

    cy.wait('@analyzeResume');
    if (Cypress.env('DEMO_PAUSE')) {
      cy.pause();
    }
    matchTable.expectMatchAtIndex(0, {
      title: 'Senior QA Engineer',
      company: 'Awesome Inc',
      score: '95',
      source: 'Work at a Startup (Mock)',
      pitch: 'Strong Cypress experience with JavaScript and Postman, but missing C++ experience.',
      url: 'https://example.com/jobs/senior-qa-engineer'
    });
  });
});
