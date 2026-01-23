/**
 * Page Object Model for the Login Page
 */
export class LoginPage {
  visit() {
    cy.visit("/login");
    return this;
  }

  fillPassword(password: string) {
    cy.get('[data-cy="password-input-field"]').type(password);
    return this;
  }

  submit() {
    cy.get('button[type="submit"]').click();
    return this;
  }

  expectHeader(text: string) {
    cy.get('[data-cy="login-header"]').should('have.text', text);
    return this;
  }
}

/**
 * Page Object Model for Resume Upload flow
 */
export class ResumePage {
  visit() {
    cy.visit("/");
    return this;
  }

  selectResumeMode() {
    cy.get('[data-cy="mode-toggle-resume"]').click();
    return this;
  }

  uploadResumeFixture(fixturePath: string) {
    cy.get('[data-cy="resume-upload-input"]').should('exist').selectFile(
      fixturePath,
      { force: true }
    );
    return this;
  }

  expectUploadedFileName(fileName: string) {
    cy.get('[data-cy="resume-upload-filename"]').should('have.text', fileName);
    return this;
  }

  analyzeResume() {
    cy.get('[data-cy="resume-upload-analyze"]').click();
    return this;
  }
}

/**
 * Page Object Model for Job Match results
 */
export class JobMatchTable {
  expectVisible() {
    cy.get('[data-cy="job-match-table"]').should('be.visible');
    return this;
  }

  expectTitleCount(count: number) {
    cy.get('[data-cy="job-match-table-title"]').should('contain', `Job Matches (${count})`);
    return this;
  }

  expectMatchAtIndex(index: number, match: {
    title: string;
    company: string;
    score: string;
    source: string;
    pitch: string;
    url: string;
  }) {
    cy.get(`[data-cy="job-match-${index}"]`).within(() => {
      cy.get('[data-cy="job-match-title"]').should('have.text', match.title);
      cy.get('[data-cy="job-match-company"]').should('have.text', match.company);
      cy.get('[data-cy="job-match-score"]').should('have.text', match.score);
      cy.get('[data-cy="job-match-source"]').should('contain', match.source);
      cy.get('[data-cy="job-match-pitch"]').should('have.text', match.pitch);
      cy.get('[data-cy="job-match-link"]').should('have.attr', 'href', match.url);
    });
    return this;
  }
}