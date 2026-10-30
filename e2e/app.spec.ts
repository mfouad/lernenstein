import { expect, test } from '@playwright/test';

// Invented lyrics only (see CLAUDE.md): LRCLIB is mocked with this text.
const INVENTED_LRC = '[00:01.00]Ich gehe heute in den Park.\n[00:04.00]Kommst du heute mit?\n[00:07.00]Wo wohnst du?';

test('public-domain song: full line, translation, table', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Gedanken', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Thoughts are free,')).toBeVisible();
  await page.getByRole('radio', { name: 'Lyrics table' }).click();
  await expect(page.getByText('who does it')).toBeVisible();
  await expect(page.getByText('thoughts are free.').first()).toBeVisible();
});

test('saved words survive a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Gedanken', { exact: true }).first().hover();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('tab', { name: /Saved · 1/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('tab', { name: /Saved · 1/ })).toBeVisible();
});

test('fetched lyrics load from the device cache when the source is down', async ({ page }) => {
  let sourceUp = true;
  await page.route('https://lrclib.net/**', (route) => sourceUp
    ? route.fulfill({ json: { syncedLyrics: INVENTED_LRC, plainLyrics: null } })
    : route.abort());
  await page.addInitScript(() => {
    if (!localStorage.getItem('lernenstein-settings')) {
      localStorage.setItem('lernenstein-settings', JSON.stringify({ state: { slug: '99-luftballons' }, version: 0 }));
    }
  });

  await page.goto('/');
  await expect(page.getByText('gehe', { exact: true })).toBeVisible();

  sourceUp = false;
  await page.reload();
  await expect(page.getByText('gehe', { exact: true })).toBeVisible();
  await expect(page.getByText(/source is unavailable/)).toHaveCount(0);
});

test('W-question chip appears on a question line', async ({ page }) => {
  await page.route('https://lrclib.net/**', (route) => route.fulfill({ json: { syncedLyrics: INVENTED_LRC, plainLyrics: null } }));
  await page.addInitScript(() => localStorage.setItem('lernenstein-settings', JSON.stringify({ state: { slug: 'du-hast' }, version: 0 })));
  await page.goto('/');
  await expect(page.getByText('gehe', { exact: true })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/W-Frage · question word, then verb/)).toBeVisible();
});
