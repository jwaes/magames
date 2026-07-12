import { test, expect } from '@playwright/test'

test('Match-3 is launchable from home and renders a board', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Drie op een rij/ }).click()
  await expect(page.getByTestId('match3-board')).toBeVisible()
  // 6x6 default → 36 tiles
  await expect(page.locator('[data-cell]')).toHaveCount(36)
})

test('a matching swap clears tiles and raises the score', async ({ page }) => {
  await page.goto('/?seed=3')
  await page.getByRole('button', { name: /Drie op een rij/ }).click()
  await expect(page.getByTestId('match3-board')).toBeVisible()
  const score = page.locator('.stat', { hasText: 'Score' }).locator('strong')
  await expect(score).toHaveText('0')

  // Ask the game for a valid move, then play the two cells it highlights. Clicks
  // fall through the pointer-events:none tile layer to the cell buttons beneath,
  // so this works whatever the seed dealt (no brittle hard-coded coordinates).
  await page.getByRole('button', { name: 'Hint' }).click()
  const hinted = page.locator('.tile-slot.hinted')
  await expect(hinted).toHaveCount(2)
  const a = (await hinted.nth(0).boundingBox())!
  const b = (await hinted.nth(1).boundingBox())!
  await page.mouse.click(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)

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
