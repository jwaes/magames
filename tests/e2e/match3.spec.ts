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

test('the board fills the viewport as a square with no overflow (both orientations, largest grid)', async ({
  page
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Drie op een rij/ }).click()
  await expect(page.getByTestId('match3-board')).toBeVisible()

  const fits = async () => {
    const m = await page.evaluate(() => {
      const de = document.documentElement
      const board = document.querySelector('[data-testid="match3-board"]')!.getBoundingClientRect()
      return {
        ovX: de.scrollWidth - de.clientWidth,
        ovY: de.scrollHeight - de.clientHeight,
        w: board.width,
        h: board.height
      }
    })
    // Nothing spills off-screen in either axis…
    expect(m.ovX).toBeLessThanOrEqual(1)
    expect(m.ovY).toBeLessThanOrEqual(1)
    // …the board is square and actually sized (not collapsed).
    expect(Math.abs(m.w - m.h)).toBeLessThanOrEqual(1)
    expect(m.w).toBeGreaterThan(200)
  }

  await fits()

  // The largest grid (8×8) must fit just as well.
  await page.getByRole('button', { name: 'Instellingen' }).click()
  await page.getByRole('button', { name: '8 × 8' }).click()
  await page.getByRole('button', { name: 'Klaar' }).click()
  await expect(page.locator('[data-cell]')).toHaveCount(64)
  await fits()
})
