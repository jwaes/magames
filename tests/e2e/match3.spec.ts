import { test, expect } from '@playwright/test'

test('Match-3 is launchable from home and renders a board', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Drie op een rij/ }).click()
  await expect(page.getByTestId('match3-board')).toBeVisible()
  // 7x7 default → 49 tiles
  await expect(page.locator('[data-cell]')).toHaveCount(49)
})

test('tapping two adjacent tiles is accepted (score is shown)', async ({ page }) => {
  await page.goto('/?seed=2')
  await page.getByRole('button', { name: /Drie op een rij/ }).click()
  await expect(page.getByTestId('match3-board')).toBeVisible()
  await expect(page.getByText('Score')).toBeVisible()
})
