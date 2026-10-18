const { _electron: electron } = require('@playwright/test');
const { test, expect } = require('@playwright/test');

test('Browser launches and opens New Tab properly', async () => {
  // 1. Launch your Electron app
  const electronApp = await electron.launch({ args: ['electron/main.js'] });

  // 2. Get the first window
  const window = await electronApp.firstWindow();

  // 3. Verify the title
  const title = await window.title();
  console.log('App Title:', title);

  // 4. Test clicking the Shield icon
  const shieldIcon = window.locator('#shield-button'); // use your actual id/class
  if (await shieldIcon.isVisible()) {
    await shieldIcon.click();
    // Verify that dialog appeared
    const dialog = window.locator('.permission-dialog');
    await expect(dialog).toBeVisible();
  }

  // 5. Close the app
  await electronApp.close();
});