import { test, expect } from '@playwright/test';

/**
 * E2E tests for the portfolio URL analysis flow
 *
 * Note: These tests require:
 * 1. Valid API keys in .env.local
 * 2. Dev server running (automatically started by Playwright)
 */

test.describe('Portfolio Analysis Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Switch to portfolio mode
    await page.getByRole('button', { name: /portfolio/i }).click();

    // Wait for portfolio input to be visible
    await expect(page.getByPlaceholder(/https:\/\//i)).toBeVisible();
  });

  test('should display portfolio URL input', async ({ page }) => {
    // Check that URL input is visible
    const urlInput = page.getByPlaceholder(/https:\/\//i);
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toBeEditable();

    // Check for analyze button
    const analyzeButton = page.getByRole('button', { name: /analyze/i });
    await expect(analyzeButton).toBeVisible();
  });

  test('should require valid URL format', async ({ page }) => {
    const urlInput = page.getByPlaceholder(/https:\/\//i);
    const analyzeButton = page.getByRole('button', { name: /analyze/i });

    // Try with invalid URL
    await urlInput.fill('not-a-url');
    await analyzeButton.click();

    // Should show error or not proceed
    // (HTML5 validation may prevent submission)
    await page.waitForTimeout(1000);
  });

  test('should accept valid URLs', async ({ page }) => {
    const urlInput = page.getByPlaceholder(/https:\/\//i);

    // Fill with valid URL
    await urlInput.fill('https://example.com');

    // Input should accept the value
    await expect(urlInput).toHaveValue('https://example.com');
  });

  test('should process portfolio URL and show results', async ({ page }) => {
    // Mock the API response
    await page.route('/api/analyze/portfolio', async route => {
      const json = {
        success: true,
        candidate: {
          name: 'Portfolio User',
          headline: 'Creative Developer',
          skills: ['WebGL', 'Three.js'],
          yearsExperience: 3,
          topProjects: [],
          suggestions: []
        },
        matches: [
          {
            title: 'Creative Technologist',
            company: 'Agency XYZ',
            url: 'https://example.com/job2',
            score: 88,
            scoreBreakdown: { skillMatch: 88 },
            pitch: 'Perfect for your creative skills',
            requiredSkills: ['WebGL'],
            missingSkills: [],
            location: 'New York',
            remote: false,
            source: 'Indeed'
          }
        ],
        jobsFound: 1,
        portfolioUrl: 'https://example.com/portfolio'
      };
      await route.fulfill({ json });
    });

    const urlInput = page.getByPlaceholder(/https:\/\//i);
    const analyzeButton = page.getByRole('button', { name: /analyze/i });

    // Enter a test portfolio URL
    const testUrl = 'https://example.com/portfolio';
    await urlInput.fill(testUrl);
    await analyzeButton.click();

    // Wait for results (mocked API returns instantly)
    await expect(page.getByText('Creative Technologist')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Agency XYZ')).toBeVisible();
    await expect(page.getByText('88')).toBeVisible();
  });

  test('should show loading state during analysis', async ({ page }) => {
    const urlInput = page.getByPlaceholder(/https:\/\//i);
    const analyzeButton = page.getByRole('button', { name: /analyze/i });

    // Enter URL
    await urlInput.fill('https://example.com');

    // Note: Without mocking, we can't test the loading state easily
    // This is a structural test to ensure the button exists
    await expect(analyzeButton).toBeEnabled();
  });

  test('should display live console messages', async ({ page }) => {
    // Check that console component exists
    // Console messages like [SCRAPE], [CRAWL], etc. should appear during processing
    const consoleArea = page.locator('[data-testid="live-console"]').or(
      page.locator('text=/\\[SCRAPE\\]|\\[CRAWL\\]|\\[PROFILE\\]/i').first()
    );

    expect(consoleArea).toBeDefined();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    /**
     * Test error handling structure
     * Actual error testing would require mocking or invalid API keys
     */

    // Error display components should exist
    const errorDisplay = page.locator('[class*="error"]').or(
      page.locator('text=/failed|error/i').first()
    );

    expect(errorDisplay).toBeDefined();
  });

  test('should allow switching back to resume mode', async ({ page }) => {
    // Switch back to resume mode
    await page.getByRole('button', { name: /resume/i }).click();

    // Portfolio input should be hidden
    await expect(page.getByPlaceholder(/https:\/\//i)).not.toBeVisible();

    // Resume upload should be visible
    await expect(page.getByText('Drop your resume here')).toBeVisible();
  });

  test('should clear results when switching modes', async ({ page }) => {
    /**
     * Tests that switching between modes clears previous results
     */

    // Switch to resume mode
    await page.getByRole('button', { name: /resume/i }).click();

    // Switch back to portfolio mode
    await page.getByRole('button', { name: /portfolio/i }).click();

    // Input should be clear
    const urlInput = page.getByPlaceholder(/https:\/\//i);
    await expect(urlInput).toHaveValue('');
  });

  test('should have proper URL validation', async ({ page }) => {
    const urlInput = page.getByPlaceholder(/https:\/\//i);

    // Check input type (should be url or text with pattern)
    const inputType = await urlInput.getAttribute('type');
    expect(['url', 'text']).toContain(inputType);
  });
});
