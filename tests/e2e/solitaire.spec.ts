import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('home screen shows Patience playable and future games disabled', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Kaartspellen' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Patience/ })).toBeEnabled()
  await expect(page.getByRole('button', { name: /Spider/ })).toBeDisabled()
  await expect(page.getByRole('button', { name: /FreeCell/ })).toBeDisabled()
})

test('starting a game deals seven tableau columns and a stock', async ({ page }) => {
  await page.getByRole('button', { name: /Patience/ }).click()
  await expect(page.getByTestId('board')).toBeVisible()
  await expect(page.getByTestId('tableau-col')).toHaveCount(7)
  await expect(page.getByTestId('stock')).toBeVisible()
})

test('drawing from the stock moves a card to the waste and counts a move', async ({ page }) => {
  await page.getByRole('button', { name: /Patience/ }).click()
  await expect(page.getByTestId('waste').getByRole('button')).toHaveCount(0)

  await page.getByTestId('stock').getByRole('button').click()

  await expect(page.getByTestId('waste').getByRole('button')).toHaveCount(1)
  // The "Zetten" (moves) counter should now read 1.
  await expect(page.locator('.stat', { hasText: 'Zetten' }).locator('strong')).toHaveText('1')
})

test('undo reverses the last action', async ({ page }) => {
  await page.getByRole('button', { name: /Patience/ }).click()
  const undo = page.getByRole('button', { name: 'Zet terugnemen' })
  await expect(undo).toBeDisabled()

  await page.getByTestId('stock').getByRole('button').click()
  await expect(undo).toBeEnabled()
  await undo.click()

  await expect(page.getByTestId('waste').getByRole('button')).toHaveCount(0)
  await expect(undo).toBeDisabled()
})

test('settings: switching to 3-card mode persists across reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Instellingen' }).click()
  await page.getByRole('button', { name: /3 kaarten/ }).click()
  await page.getByRole('button', { name: 'Klaar' }).click()

  await page.reload()
  await page.getByRole('button', { name: 'Instellingen' }).click()
  // The 3-card option should still be selected after a reload.
  await expect(page.getByRole('button', { name: /3 kaarten/ })).toHaveClass(/selected/)
})

test('tap-to-move relocates a card to a valid pile (deterministic seed)', async ({ page }) => {
  // Seed 1 deals the 4 of clubs as a tableau top card that can move to another column.
  await page.goto('/?seed=1')
  await page.getByRole('button', { name: /Patience/ }).click()

  const cols = page.getByTestId('tableau-col')
  // Before: the 6th column (index 5) does not contain the 4 of clubs.
  await expect(cols.nth(5).getByRole('button', { name: '4 clubs' })).toHaveCount(0)

  // Tap the 4 of clubs — it should fly to its valid destination on its own.
  await page.getByRole('button', { name: '4 clubs' }).click()

  // After: the 4 of clubs now lives in the 6th column, and one move is counted.
  await expect(cols.nth(5).getByRole('button', { name: '4 clubs' })).toHaveCount(1)
  await expect(page.locator('.stat', { hasText: 'Zetten' }).locator('strong')).toHaveText('1')
})

test('the board fits the viewport with no horizontal overflow (both orientations)', async ({ page }) => {
  await page.getByRole('button', { name: /Patience/ }).click()
  await expect(page.getByTestId('board')).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  expect(overflow).toBeLessThanOrEqual(1)
})

test('settings: switching to drag mode persists across reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Instellingen' }).click()
  await page.getByRole('button', { name: /Slepen/ }).click()
  await page.getByRole('button', { name: 'Klaar' }).click()

  await page.reload()
  await page.getByRole('button', { name: 'Instellingen' }).click()
  await expect(page.getByRole('button', { name: /Slepen/ })).toHaveClass(/selected/)
})

test('drag mode: dragging a card onto a legal pile moves it', async ({ page }) => {
  // Seed 1: the 4 of clubs (top of column 4) legally moves onto column 6.
  await page.goto('/?seed=1')
  await page.getByRole('button', { name: /Patience/ }).click()
  // Enable drag mode via settings.
  await page.getByRole('button', { name: 'Instellingen' }).click()
  await page.getByRole('button', { name: /Slepen/ }).click()
  await page.getByRole('button', { name: 'Klaar' }).click()

  const cols = page.getByTestId('tableau-col')
  await expect(cols.nth(5).getByRole('button', { name: '4 clubs' })).toHaveCount(0)

  const from = page.getByRole('button', { name: '4 clubs' })
  const to = cols.nth(5)
  const a = await from.boundingBox()
  const b = await to.boundingBox()
  if (!a || !b) throw new Error('missing boxes')
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  // Move in steps so pointermove fires and the threshold is crossed.
  await page.mouse.move(b.x + b.width / 2, b.y + 20, { steps: 8 })
  await page.mouse.up()

  await expect(cols.nth(5).getByRole('button', { name: '4 clubs' })).toHaveCount(1)
})

test('stats screen opens from home and shows tiles', async ({ page }) => {
  await page.getByRole('button', { name: /Statistieken/ }).click()
  await expect(page.getByRole('heading', { name: 'Statistieken' })).toBeVisible()
  await expect(page.getByText('Gewonnen')).toBeVisible()
  await expect(page.getByText('Speeltijd')).toBeVisible()
  await page.getByRole('button', { name: 'Terug' }).click()
  await expect(page.getByRole('heading', { name: 'Kaartspellen' })).toBeVisible()
})
