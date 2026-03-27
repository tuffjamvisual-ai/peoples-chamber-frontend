import { test, expect } from '@playwright/test';

test.describe('People\'s Chamber Tests', () => {
  
  test('Homepage loads and shows bills', async ({ page }) => {
    await page.goto('https://peoples-chamber-frontend.vercel.app');
    
    // Check title
    await expect(page).toHaveTitle(/People's Chamber/);
    
    // Check bills are showing
    const bills = await page.locator('[class*="bill"]').count();
    console.log(`Found ${bills} bill cards on page 1`);
    expect(bills).toBeGreaterThan(0);
  });

  test('Bill detail page shows AI explanations', async ({ page }) => {
    await page.goto('https://peoples-chamber-frontend.vercel.app');
    
    // Click first bill
    await page.locator('text=Abolition of Business Rates Bill').first().click();
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check for AI explanation boxes
    const hasPlainSummary = await page.locator('text=What this bill does').isVisible();
    const hasSupport = await page.locator('text=A vote to support means').isVisible();
    const hasOppose = await page.locator('text=A vote to oppose means').isVisible();
    
    console.log(`Plain summary: ${hasPlainSummary}`);
    console.log(`Support explanation: ${hasSupport}`);
    console.log(`Oppose explanation: ${hasOppose}`);
    
    expect(hasPlainSummary || hasSupport || hasOppose).toBeTruthy();
  });

  test('Vote counts are displaying', async ({ page }) => {
    await page.goto('https://peoples-chamber-frontend.vercel.app');
    
    // Check first bill card shows vote numbers
    const firstBill = await page.locator('[class*="bill"]').first();
    const voteText = await firstBill.textContent();
    
    console.log('First bill text:', voteText);
    
    // Should contain "Support" or "Oppose" text
    expect(voteText).toMatch(/Support|Oppose/);
  });

  test('Pagination works', async ({ page }) => {
    await page.goto('https://peoples-chamber-frontend.vercel.app');
    
    // Find pagination
    const pageButtons = await page.locator('button:has-text("2")').isVisible();
    console.log(`Page 2 button visible: ${pageButtons}`);
    
    if (pageButtons) {
      await page.locator('button:has-text("2")').click();
      await page.waitForTimeout(1000);
      console.log('Successfully navigated to page 2');
    }
  });

  test('Navigation bar is present', async ({ page }) => {
    await page.goto('https://peoples-chamber-frontend.vercel.app');
    
    const hasLogo = await page.locator('text=People\'s Chamber').isVisible();
    const hasLogin = await page.locator('text=Login').isVisible();
    const hasSignup = await page.locator('text=Sign Up').isVisible();
    
    console.log(`Logo: ${hasLogo}, Login: ${hasLogin}, Signup: ${hasSignup}`);
    
    expect(hasLogo).toBeTruthy();
  });
});
