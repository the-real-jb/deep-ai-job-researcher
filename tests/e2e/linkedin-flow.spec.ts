import { test, expect } from '@playwright/test';

test.describe('LinkedIn Integration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should verify LinkedIn mode UI elements', async ({ page }) => {
    // 1. Select LinkedIn mode
    const linkedinTab = page.getByRole('button', { name: /LinkedIn/i });
    await expect(linkedinTab).toBeVisible();
    await linkedinTab.click();

    // 2. Wait for mode transition and verify inputs exist
    await page.waitForTimeout(500); // Wait for any animations
    await expect(page.getByText('1. Upload Your Resume')).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('https://www.linkedin.com/in/yourprofile')).toBeVisible();
    
    // 3. Verify analyze button exists (disabled initially or enabled depends on state, assuming check for presence)
    await expect(page.getByRole('button', { name: /Analyze LinkedIn Profile/i })).toBeVisible();
  });

  test('should validate LinkedIn URL format', async ({ page }) => {
    await page.getByRole('button', { name: /LinkedIn/i }).click();
    await page.waitForTimeout(500); // Wait for mode transition

    // First upload a file so button becomes enabled
    const buffer = Buffer.from('%PDF-1.4\n%...');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer
    });

    const urlInput = page.getByPlaceholder('https://www.linkedin.com/in/yourprofile');
    await expect(urlInput).toBeVisible();
    
    // Type invalid URL
    await urlInput.fill('https://facebook.com/me');
    
    // Click the submit button to trigger validation
    const submitButton = page.getByRole('button', { name: /Analyze LinkedIn Profile/i });
    await submitButton.click();
    
    // Should show error message for invalid LinkedIn URL
    await expect(page.getByText(/linkedin\.com/i)).toBeVisible({ timeout: 5000 });
  });

  test('should successfully simulate a LinkedIn analysis flow', async ({ page }) => {
    // Mock the API response
    await page.route('/api/analyze/linkedin', async route => {
      const json = {
        success: true,
        candidate: {
          name: 'Test User',
          headline: 'Software Engineer',
          skills: ['React', 'TypeScript', 'Node.js'],
          coreSkills: ['React', 'TypeScript'],
          yearsExperience: 5,
          experienceLevel: 'Senior',
          location: 'San Francisco, CA',
          topProjects: ['Project A'],
          suggestions: [],
          missingSkills: []
        },
        matches: [
          {
            title: 'Senior Frontend Engineer',
            company: 'Tech Corp',
            url: 'https://linkedin.com/jobs/view/123',
            score: 95,
            scoreBreakdown: {
              skillMatch: 35,
              experienceMatch: 30,
              projectMatch: 20,
              preferenceMatch: 10
            },
            pitch: 'Perfect match for your React skills.',
            requiredSkills: ['React'],
            niceToHaveSkills: ['AWS'],
            missingSkills: [],
            source: 'LinkedIn Jobs',
            location: 'Remote',
            remote: true
          },
          {
            title: 'Full Stack Developer',
            company: 'Startup Inc',
            url: 'https://workatastartup.com/jobs/456',
            score: 85,
            scoreBreakdown: {
              skillMatch: 30,
              experienceMatch: 25,
              projectMatch: 20,
              preferenceMatch: 10
            },
            pitch: 'Great opportunity.',
            source: 'Work at a Startup',
            location: 'New York, NY',
            remote: false
          }
        ],
        jobsFound: 2,
        linkedInJobsFound: 1,
        otherJobsFound: 1,
        linkedInProfile: {
          name: 'Test User',
          headline: 'Software Engineer',
          location: 'San Francisco, CA',
          connections: 500,
          skills: ['React', 'TypeScript']
        }
      };
      await route.fulfill({ json });
    });

    // 1. Navigate and Select Mode
    await page.getByRole('button', { name: /LinkedIn/i }).click();
    await page.waitForTimeout(500); // Wait for mode transition

    // 2. Upload Dummy PDF
    const buffer = Buffer.from('%PDF-1.4\n%...');
    const fileInput = page.locator('#linkedin-file-input');
    await fileInput.setInputFiles({
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer
    });

    // 3. Enter LinkedIn URL
    const urlInput = page.getByPlaceholder('https://www.linkedin.com/in/yourprofile');
    await urlInput.fill('https://www.linkedin.com/in/testuser');

    // 4. Submit - wait for button to be enabled
    const submitButton = page.getByRole('button', { name: /Analyze LinkedIn Profile/i });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // 5. Verify Results (mocked API returns instantly)
    // Check if matches appear
    await expect(page.getByText('Senior Frontend Engineer')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Tech Corp')).toBeVisible();
    await expect(page.getByText('95')).toBeVisible(); // Score

    // Check if breakdown is visible (maybe hover or expanded)
    // Just checking presence of score is good for E2E high level
    
    // Check LinkedIn specific data display if applicable
    // (Depends on UI, maybe "Enhanced Profile" badge or similar)
  });
});
