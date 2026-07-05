import { test, expect } from '@playwright/test'

test('Match-3 is launchable from home and renders a board', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Drie op een rij/ }).click()
  await expect(page.getByTestId('match3-board')).toBeVisible()
  // 7x7 default → 49 tiles
  await expect(page.locator('[data-cell]')).toHaveCount(49)
})

test('a matching swap clears tiles and raises the score', async ({ page }) => {
  await page.goto('/?seed=3')
  await page.getByRole('button', { name: /Drie op een rij/ }).click()
  await expect(page.getByTestId('match3-board')).toBeVisible()
  const score = () => page.locator('.stat', { hasText: 'Score' }).locator('strong')
  await expect(score()).toHaveText('0')

  // Tap through adjacent pairs until one is a legal swap that clears a match.
  let matched = false
  for (let r = 0; r < 7 && !matched; r++) {
    for (let c = 0; c < 7 && !matched; c++) {
      for (const [dr, dc] of [
        [0, 1],
        [1, 0]
      ] as const) {
        const nr = r + dr
        const nc = c + dc
        if (nr >= 7 || nc >= 7) continue
        await page.locator(`[data-cell="${r}-${c}"] button`).click()
        await page.locator(`[data-cell="${nr}-${nc}"] button`).click()
        if ((await score().innerText()) !== '0') {
          matched = true
          break
        }
      }
    }
  }
  expect(matched).toBe(true)
  await expect(score()).not.toHaveText('0')
})
