# Reference snippet (copied inline into browser_automation scripts): start an easy run and enter W1 battle
START = """
await page.wait_for_selector('[data-testid="new-run-btn"]', timeout=10000)
await page.click('[data-testid="new-run-btn"]')
for t in ["add-mark","add-axel","add-nathan"]:
    await page.click(f'[data-testid="{t}"]')
await page.click('[data-testid="difficulty-easy"]')
await page.click('[data-testid="start-run-btn"]')
await page.wait_for_timeout(800)
if await page.locator('[data-testid="perk-offer-skip"]').count():
    await page.click('[data-testid="perk-offer-skip"]')
await page.click('[data-testid="act-intro-start"]')
await page.click('[data-testid="map-node-act1:1:0"]', force=True)
await page.click('[data-testid="map-enter"]', force=True)
"""
