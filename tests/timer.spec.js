const { test, expect } = require('@playwright/test');

test.describe('Play Off Timer', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
  });

  test('shows 2:00 by default', async ({ page }) => {
    const timer = page.locator('#timer');
    await expect(timer).toHaveText('2:00');
  });

  test('starts counting down when play is pressed', async ({ page }) => {
    await page.click('#playPauseBtn');
    // Wait for at least 2 ticks
    await page.waitForTimeout(2500);
    const text = await page.locator('#timer').textContent();
    // Should be 1:57 or 1:58 — definitely less than 2:00
    expect(text).toMatch(/^1:5[5-8]$/);
  });

  test('play button switches to pause icon while running', async ({ page }) => {
    await expect(page.locator('#playIcon')).toBeVisible();
    await expect(page.locator('#pauseIcon')).toBeHidden();

    await page.click('#playPauseBtn');

    await expect(page.locator('#playIcon')).toBeHidden();
    await expect(page.locator('#pauseIcon')).toBeVisible();
  });

  test('pause freezes the timer', async ({ page }) => {
    await page.click('#playPauseBtn');
    await page.waitForTimeout(2000);
    // Pause
    await page.click('#playPauseBtn');
    const frozenText = await page.locator('#timer').textContent();
    await page.waitForTimeout(1500);
    const afterText = await page.locator('#timer').textContent();
    expect(afterText).toBe(frozenText);
  });

  test('stop resets timer to duration', async ({ page }) => {
    await page.click('#playPauseBtn');
    await page.waitForTimeout(2000);
    await page.click('#stopBtn');

    await expect(page.locator('#timer')).toHaveText('2:00');
    await expect(page.locator('#playIcon')).toBeVisible();
  });

  test('timer goes negative after reaching zero', async ({ page }) => {
    // Set duration to minimum (30s) then manipulate remaining via JS
    await page.evaluate(() => {
      setDuration(30);
    });
    // Fast-forward the timer to near zero via JS
    await page.evaluate(() => {
      remaining = 2;
    });
    await page.click('#playPauseBtn');
    await page.waitForTimeout(3500);

    const text = await page.locator('#timer').textContent();
    expect(text).toMatch(/^-/);
    await expect(page.locator('#timer')).toHaveClass(/overtime/);
  });

  test('increment and decrement change the duration', async ({ page }) => {
    await page.click('#incBtn');
    await expect(page.locator('#timer')).toHaveText('2:30');
    await expect(page.locator('#durationLabel')).toHaveText('2:30');

    await page.click('#decBtn');
    await expect(page.locator('#timer')).toHaveText('2:00');

    await page.click('#decBtn');
    await expect(page.locator('#timer')).toHaveText('1:30');
  });

  test('duration is clamped to min/max', async ({ page }) => {
    // Decrease to minimum (30s)
    for (let i = 0; i < 10; i++) await page.click('#decBtn');
    await expect(page.locator('#timer')).toHaveText('0:30');

    // Try to go below
    await page.click('#decBtn');
    await expect(page.locator('#timer')).toHaveText('0:30');
  });

  test('duration picker is disabled while running', async ({ page }) => {
    await page.click('#playPauseBtn');
    const opacity = await page.locator('#durationPicker').evaluate(el => getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeLessThan(1);
  });

  test('duration persists via cookie', async ({ page, context }) => {
    await page.click('#incBtn'); // 2:30
    await page.click('#incBtn'); // 3:00
    await expect(page.locator('#timer')).toHaveText('3:00');

    // Reload the page — cookie should restore 3:00
    await page.goto('/');
    await expect(page.locator('#timer')).toHaveText('3:00');
    await expect(page.locator('#durationLabel')).toHaveText('3:00');
  });

  test('stop resets to custom duration, not default', async ({ page }) => {
    await page.click('#incBtn'); // 2:30
    await page.click('#playPauseBtn');
    await page.waitForTimeout(1500);
    await page.click('#stopBtn');

    await expect(page.locator('#timer')).toHaveText('2:30');
  });

  test('resume after pause continues from paused time', async ({ page }) => {
    await page.click('#playPauseBtn');
    await page.waitForTimeout(2000);
    await page.click('#playPauseBtn'); // pause
    const pausedText = await page.locator('#timer').textContent();

    await page.click('#playPauseBtn'); // resume
    await page.waitForTimeout(1500);
    const resumed = await page.locator('#timer').textContent();
    // Timer should have advanced past the paused value
    expect(resumed).not.toBe(pausedText);
  });
});
