import { test, expect } from '@playwright/test';

test.describe('Designer Project Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock Auth
    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-designer-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: 'mock-designer-uuid',
            email: 'designer@example.com',
            user_metadata: { full_name: 'Designer Name' },
          },
        }),
      });
    });

    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-designer-uuid',
          email: 'designer@example.com',
          user_metadata: { full_name: 'Designer Name' },
        }),
      });
    });

    // 2. Mock Role & Profile
    await page.route('**/rest/v1/users?id=eq.*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'mock-designer-uuid',
            email: 'designer@example.com',
            role: 'designer',
            profile_completed: true,
          },
        ]),
      });
    });

    // 3. Mock Designer Details Fetch
    await page.route('**/rest/v1/designers?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 42,
            user_id: 'mock-designer-uuid',
            name: 'Designer Name',
            is_verified: true,
            city: 'Hyderabad',
          },
        ]),
      });
    });

    // 4. Mock Projects and Connections Reads
    await page.route('**/rest/v1/designer_projects?*', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else if (method === 'POST') {
        const payload = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 999,
            designer_id: 42,
            title: payload.title,
            place: payload.place,
            project_category: payload.project_category,
            status: 'approved',
          }),
        });
      }
    });

    await page.route('**/rest/v1/connections?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // 5. Mock Storage Uploads
    await page.route('**/storage/v1/object/portfolio/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          Key: 'portfolio/mock-upload-path.webp',
        }),
      });
    });

    // 6. Mock Project Images Insert
    await page.route('**/rest/v1/project_images', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1001,
            project_id: 999,
            image_url: 'https://amcsynborvioqgqmsbhn.supabase.co/storage/v1/object/public/portfolio/mock-upload-path.webp',
            room_category: 'Living Room',
            is_cover: true,
          },
        ]),
      });
    });
  });

  test('successfully uploads a new project with compressed images', async ({ page }) => {
    // Navigate and login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'designer@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button:has-text("Sign In")');

    // Should redirect directly to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Fill project form fields
    await page.fill('input[placeholder="E.g., Modern Minimalist Villa"]', 'Modern Minimalist Villa');
    await page.fill('input[placeholder="E.g., Jubilee Hills"]', 'Jubilee Hills');
    await page.fill('textarea[placeholder="Describe the scope, the materials used..."]', 'A gorgeous minimalist design project.');

    // Select category Living Room
    await page.click('button:has-text("Living Room")');

    // Create a simple 1x1 pixel PNG dummy file buffer
    const dummyImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // Upload image
    await page.setInputFiles('input[type="file"]', {
      name: 'dummy.png',
      mimeType: 'image/png',
      buffer: dummyImage,
    });

    // Intercept to check upload & project submission
    const publishPromise = page.waitForResponse((res) => res.url().includes('/rest/v1/designer_projects') && res.request().method() === 'POST');

    // Click Publish Complete Project
    await page.click('button:has-text("Publish Complete Project")');

    // Await response & assert toast message is rendered
    await publishPromise;
    const toast = page.locator('.hot-toast-message, div[role="status"]');
    await expect(toast).toContainText(/success/i);
  });
});
import { Buffer } from 'node:buffer';
