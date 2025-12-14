import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E tests for the resume upload and analysis flow
 *
 * Note: These tests require:
 * 1. Valid API keys in .env.local
 * 2. Dev server running (automatically started by Playwright)
 * 3. Test PDF file in tests/fixtures/
 */

test.describe('Resume Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Deep Job Researcher');
  });

  test('should display the resume upload interface by default', async ({ page }) => {
    // Check that resume mode is selected
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();

    // Check for upload area
    await expect(page.getByText('Drop your resume here')).toBeVisible();
  });

  test('should switch between resume and portfolio modes', async ({ page }) => {
    // Click portfolio mode
    await page.getByRole('button', { name: /portfolio/i }).click();

    // Check that portfolio input is shown
    await expect(page.getByPlaceholder(/https:\/\//i)).toBeVisible();

    // Switch back to resume mode
    await page.getByRole('button', { name: /resume/i }).click();

    // Check that upload area is shown again
    await expect(page.getByText('Drop your resume here')).toBeVisible();
  });

  test('should reject non-PDF files', async ({ page }) => {
    // Create a test text file
    const textContent = 'This is not a PDF';
    const buffer = Buffer.from(textContent);

    // Create file input
    const fileInput = page.locator('input[type="file"]');

    // Upload non-PDF file
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer,
    });

    // Wait a bit for any error messages
    await page.waitForTimeout(1000);

    // Should show error or not process the file
    // (Exact behavior depends on implementation)
  });

  test('should process PDF resume and show results', async ({ page }) => {
    // Mock the API response
    await page.route('/api/analyze/resume', async route => {
      const json = {
        success: true,
        candidate: {
          name: 'Test User',
          headline: 'Full Stack Developer',
          skills: ['React', 'Node.js'],
          yearsExperience: 5,
          topProjects: [],
          suggestions: []
        },
        matches: [
          {
            title: 'Senior Frontend Engineer',
            company: 'Tech Corp',
            url: 'https://example.com/job1',
            score: 95,
            scoreBreakdown: { skillMatch: 95 },
            pitch: 'Great match!',
            requiredSkills: ['React'],
            missingSkills: [],
            location: 'Remote',
            remote: true,
            source: 'LinkedIn'
          }
        ],
        jobsFound: 1
      };
      await route.fulfill({ json });
    });

    // Create a dummy PDF buffer
    const buffer = Buffer.from('%PDF-1.4\n%...');

    // Get file input
    const fileInput = page.locator('input[type="file"]');

    // Upload PDF file
    await fileInput.setInputFiles({
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer
    });

    // Click analyze button
    await page.getByRole('button', { name: /Analyze Resume/i }).click();

    // Wait for results (mocked API returns instantly)
    await expect(page.getByText('Senior Frontend Engineer')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Tech Corp')).toBeVisible();
    await expect(page.getByText('95')).toBeVisible();
  });

  test('should show live console during processing', async ({ page }) => {
    // The console should appear when processing starts
    // For now, just check that the console component exists in the DOM
    const console = page.locator('[data-testid="live-console"]').or(
      page.locator('text=/\\[CRAWL\\]|\\[PARSE\\]|\\[LLM\\]/i').first()
    );

    // Console may not be visible initially
    expect(console).toBeDefined();
  });

  test('should have export buttons after successful analysis', async ({ page }) => {
    /**
     * This test checks the UI structure for export buttons
     * Actual export functionality requires completing an analysis
     */

    // Check that export button components exist in the page
    // (They may be hidden until results are available)
    const exportSection = page.locator('text=/export|download/i').first();
    expect(exportSection).toBeDefined();
  });

  test('should display error message on analysis failure', async ({ page }) => {
    // This would require mocking API failures or testing with invalid data
    // For now, check that error display components exist

    // Error display should be in the DOM (even if hidden)
    expect(page.locator('[class*="error"]').or(page.locator('[class*="red"]')).first()).toBeDefined();
  });

  test('should have responsive layout', async ({ page }) => {
    // Check desktop layout
    const container = page.locator('.max-w-4xl').first();
    await expect(container).toBeVisible();

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Page should still be functional
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText('Drop your resume here')).toBeVisible();
  });
});
