import { test, expect, type Page } from '@playwright/test'

async function selectTool(page: Page, group: string, tool: string) {
  if (page.viewportSize()!.width < 761) await page.getByRole('navigation', { name: '移动工具导航' }).getByRole('button', { name: tool, exact: true }).click()
  else {
    const nav = page.getByRole('navigation', { name: '工具导航', exact: true }), category = nav.getByRole('button', { name: group, exact: true })
    if (await category.getAttribute('aria-expanded') !== 'true') await category.click()
    await nav.locator('.nav-item').filter({ has: page.getByText(tool, { exact: true }) }).click()
  }
}

test('homepage category cards use the same overview presentation without individual launch buttons', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.home-category-card')).toHaveCount(7)
  await expect(page.locator('.home-category-card button')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '文本工具', exact: true })).toBeVisible()
  await selectTool(page, '文本工具', '文本对比')
  await expect(page.getByRole('heading', { name: '文本对比', exact: true })).toBeVisible()
})

test('shared compact headers leave other tools readable and reachable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 768 }); await page.goto('/')
  for (const [group, tool] of [['编码工具', 'Base64'], ['对称加密', 'SM4'], ['摘要算法', 'SHA'], ['时间工具', '时间戳']]) {
    await selectTool(page, group, tool)
    const active = page.locator('.main-content > section:not([hidden])'), header = active.locator('.tool-header')
    await expect(header.getByRole('heading')).toBeVisible()
    expect((await header.boundingBox())!.height).toBeLessThanOrEqual(60)
    expect(await header.locator('p').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(13)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
  }
})

for (const viewport of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1280, height: 768 }, { width: 390, height: 844 }]) {
  test(`compact JSON and JWT workspaces at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto('/')
    await selectTool(page, '编码工具', 'JSON')
    const input = page.getByRole('textbox', { name: 'JSON 输入', exact: true })
    await input.fill(JSON.stringify({ user: 'preview-user', items: Array.from({ length: 80 }, (_, i) => ({ id: i, enabled: true })) }))
    await page.getByRole('button', { name: '格式化 JSON', exact: true }).click()
    await expect(page.getByRole('list', { name: 'JSON 树形结构' })).toBeVisible()
    await expect(page.locator('.json-input-copy')).toHaveCount(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    if (viewport.width >= 1280) {
      expect((await page.locator('.json-tool .tool-header').boundingBox())!.height).toBeLessThanOrEqual(50)
      expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(400)
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height)
      await expect(page.getByRole('button', { name: '清空', exact: true })).toBeInViewport()
    }
    await page.screenshot({ path: `artifacts/compact-json-${viewport.width}.png`, fullPage: true })
    await selectTool(page, '编码工具', 'JWT')
    await page.getByRole('radio', { name: '生成', exact: true }).locator('..').click()
    const claims = page.getByRole('textbox', { name: 'Claims / Payload JSON', exact: true })
    await claims.fill(JSON.stringify({ sub: 'preview-user', roles: ['reader'], detail: 'x'.repeat(1200) }, null, 2))
    await page.getByLabel('生成 Secret（可选）', { exact: true }).fill('preview-secret')
    const generated = page.getByLabel('生成的 JWT', { exact: true })
    await expect(generated).toHaveText(/^[^.]+\.[^.]+\.[^.]+$/, { timeout: 10_000 })
    const token = (await generated.textContent())!
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    if (viewport.width >= 1280) {
      expect((await page.locator('.jwt-tool .tool-header').boundingBox())!.height).toBeLessThanOrEqual(50)
      expect((await page.locator('.jwt-mode-row').boundingBox())!.height).toBeLessThanOrEqual(42)
      expect((await generated.boundingBox())!.height).toBeGreaterThanOrEqual(400)
      expect((await claims.boundingBox())!.height).toBeGreaterThanOrEqual(180)
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height)
    }
    await page.screenshot({ path: `artifacts/compact-jwt-generate-${viewport.width}.png`, fullPage: true })
    await page.getByRole('radio', { name: '解析', exact: true }).locator('..').click()
    const jwt = page.getByRole('textbox', { name: 'JWT', exact: true })
    await jwt.fill(token); await page.getByLabel('解析 Secret（可选）', { exact: true }).fill('preview-secret')
    await expect(page.getByText('签名有效', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByLabel('JWT Claims/Payload', { exact: true })).toContainText('preview-user')
    if (viewport.width >= 1280) expect((await jwt.boundingBox())!.height).toBeGreaterThanOrEqual(400)
    await page.screenshot({ path: `artifacts/compact-jwt-parse-${viewport.width}.png`, fullPage: true })
  })
}
