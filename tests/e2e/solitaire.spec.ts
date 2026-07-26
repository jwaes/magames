import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('home screen shows Patience and Match-3 playable and future games disabled', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Kaartspellen' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Patience/ })).toBeEnabled()
  await expect(page.getByRole('button', { name: /Drie op een rij/ })).toBeEnabled()
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

test('settings: swapping the layout mirrors the deck pair to the right edge', async ({ page }) => {
  await page.goto('/?seed=1')
  await page.getByRole('button', { name: /Patience/ }).click()
  const stock = page.getByTestId('stock')
  const waste = page.getByTestId('waste')
  const foundation = page.locator('[data-drop-foundation="0"]')

  // By default the deck (stock) sits left of the foundations, with the waste
  // just inside it — so the deck is on the outer (left) edge of the row.
  expect((await stock.boundingBox())!.x).toBeLessThan((await foundation.boundingBox())!.x)
  expect((await stock.boundingBox())!.x).toBeLessThan((await waste.boundingBox())!.x)

  await page.getByRole('button', { name: 'Instellingen' }).click()
  await page.getByRole('button', { name: /Stapel rechts/ }).click()
  await page.getByRole('button', { name: 'Klaar' }).click()

  // After swapping, the pair mirrors: the deck is right of the foundations AND
  // right of the waste, so it sits on the outer (right) edge of the row.
  expect((await stock.boundingBox())!.x).toBeGreaterThan((await foundation.boundingBox())!.x)
  expect((await stock.boundingBox())!.x).toBeGreaterThan((await waste.boundingBox())!.x)
})

test('settings: choosing a number font changes the rank typeface', async ({ page }) => {
  await page.goto('/?seed=1')
  await page.getByRole('button', { name: /Patience/ }).click()

  const rankFont = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--rank-font')
    )

  // Default is the low-vision "Helder" (Atkinson Hyperlegible) face.
  expect(await rankFont()).toContain('CardNumHelder')

  await page.getByRole('button', { name: 'Instellingen' }).click()
  await page.getByRole('button', { name: 'Klassiek' }).click()
  await page.getByRole('button', { name: 'Klaar' }).click()

  expect(await rankFont()).toContain('CardNumKlassiek')
})

test('drag mode: the dragged card is hidden in its pile (no visible duplicate)', async ({ page }) => {
  await page.goto('/?seed=1')
  await page.getByRole('button', { name: /Patience/ }).click()
  await page.getByRole('button', { name: 'Instellingen' }).click()
  await page.getByRole('button', { name: /Slepen/ }).click()
  await page.getByRole('button', { name: 'Klaar' }).click()

  const card = page.getByRole('button', { name: '4 clubs' })
  // The .stacked wrapper carries the opacity that hides the original while dragging.
  const holder = page.locator('.stacked', { has: card })
  await expect(holder).toHaveCSS('opacity', '1') // fully visible before any drag

  const box = (await card.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  // Move past the drag threshold and hold (do not release).
  await page.mouse.move(box.x + 120, box.y + 140, { steps: 10 })

  // A single ghost now follows the pointer, and the original is invisible —
  // so you can see the card beneath instead of a duplicate.
  await expect(page.locator('.ghost')).toHaveCount(1)
  await expect(holder).toHaveCSS('opacity', '0')

  await page.mouse.up()
  // After dropping, nothing stays hidden.
  await expect(page.locator('.ghost')).toHaveCount(0)
})

test('tapping a card with nowhere to go wiggles it instead of silently doing nothing', async ({
  page
}) => {
  // Seed 1 deals the queen of diamonds alone in column 1. There is no black king
  // and no empty column, so she has no legal destination — a guaranteed refusal.
  await page.goto('/?seed=1')
  await page.getByRole('button', { name: /Patience/ }).click()

  // Count wiggle animations rather than racing the 250ms class. Svelte PREFIXES
  // the component scope hash onto keyframe names (svelte-1udyrqm-wiggle), so this
  // has to be a substring match, not a prefix one.
  await page.evaluate(() => {
    ;(window as unknown as { __wiggles: number }).__wiggles = 0
    document.addEventListener(
      'animationstart',
      (e) => {
        if ((e as AnimationEvent).animationName.includes('wiggle')) {
          ;(window as unknown as { __wiggles: number }).__wiggles++
        }
      },
      true
    )
  })

  await page.getByRole('button', { name: 'Q diamonds' }).click()

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __wiggles: number }).__wiggles))
    .toBe(1)
  // …and the refusal really was a refusal: no move was counted.
  await expect(page.locator('.stat', { hasText: 'Zetten' }).locator('strong')).toHaveText('0')
})

test('Hint points at the deck when drawing is the useful move', async ({ page }) => {
  await page.goto('/?seed=1')
  await page.getByRole('button', { name: /Patience/ }).click()

  const stock = page.getByTestId('stock')
  const moves = page.locator('.stat', { hasText: 'Zetten' }).locator('strong')
  await expect(stock).not.toHaveClass(/deck-hint/)

  // Keep asking for a hint, taking the suggested board move each time, until the
  // only useful thing left is to turn the deck. Bounded so a regression fails
  // fast instead of hanging.
  let pulsed = false
  for (let i = 0; i < 12 && !pulsed; i++) {
    await page.getByRole('button', { name: 'Hint' }).click()
    if (await stock.evaluate((el) => el.classList.contains('deck-hint'))) {
      pulsed = true
      break
    }
    const hintedCard = page.locator('.card.hinted').first()
    if ((await hintedCard.count()) === 0) break
    const before = await moves.textContent()
    await hintedCard.click()
    // Wait on real state, not a sleep: the move must land, and the glide overlay
    // must be gone before the next hint is asked for.
    await expect(moves).not.toHaveText(before ?? '')
    await expect(page.locator('.fly-card')).toHaveCount(0)
  }
  expect(pulsed).toBe(true)
})
