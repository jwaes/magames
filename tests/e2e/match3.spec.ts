import { test, expect } from '@playwright/test'

test('Match-3 is launchable from home and renders a board', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Drie op een rij/ }).click()
  await expect(page.getByTestId('match3-board')).toBeVisible()
  // 7x7 default → 49 tiles
  await expect(page.locator('[data-cell]')).toHaveCount(49)
})

test('a matching swap clears tiles and raises the score', async ({ page }) => {
  // Seed 3: swapping cell (0,0) with (1,0) is a legal move that clears a match.
  await page.goto('/?seed=3')
  await page.getByRole('button', { name: /Drie op een rij/ }).click()
  await expect(page.getByTestId('match3-board')).toBeVisible()
  const score = page.locator('.stat', { hasText: 'Score' }).locator('strong')
  await expect(score).toHaveText('0')

  await page.locator('[data-cell="0-0"]').click()
  await page.locator('[data-cell="1-0"]').click()

  // The swap resolves asynchronously (explode → fall animation); the score rises.
  await expect(score).not.toHaveText('0', { timeout: 3000 })
})
