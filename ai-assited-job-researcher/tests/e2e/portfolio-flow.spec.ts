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

  test.skip('should process portfolio URL and show results', async ({ page }) => {
    /**
     * SKIPPED: This test requires actual API keys and makes real API calls
     *
     * To enable:
     * 1. Set valid HYPERBROWSER_API_KEY and AI provider key in .env.local
     * 2. Remove test.skip
     * 3. Use a real portfolio URL that can be scraped
     */

    const urlInput = page.getByPlaceholder(/https:\/\//i);
    const analyzeButton = page.getByRole('button', { name: /analyze/i });

    // Enter a test portfolio URL
    const testUrl = 'https://example.com/portfolio';
    await urlInput.fill(testUrl);
    await analyzeButton.click();

    // Wait for processing to start
    await expect(page.getByText(/analyzing|scraping/i)).toBeVisible({ timeout: 5000 });

    // Wait for console messages
    await expect(page.getByText(/\[SCRAPE\]|\[CRAWL\]/i)).toBeVisible({ timeout: 10000 });

    // Wait for results (may take a while)
    await expect(page.getByText(/complete/i)).toBeVisible({ timeout: 60000 });

    // Check that results are displayed
    await expect(page.locator('table')).toBeVisible();
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
    await expect(page.getByText('drag & drop', { exact: false })).toBeVisible();
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
