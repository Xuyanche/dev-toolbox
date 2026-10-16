import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { mkdir, mkdtemp } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'

test('first comparison survives a development server with a fresh dependency cache', async ({ page }) => {
  test.setTimeout(60_000)
  const cacheRoot = resolve('.cache')
  await mkdir(cacheRoot, { recursive: true })
  const cacheDir = await mkdtemp(resolve(cacheRoot, 'vite-worker-regression-'))
  const server = await createServer({ configFile: resolve('vite.config.ts'), cacheDir, server: { host: '127.0.0.1', port: 5179 } })
  let navigations = 0
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++ })
  try {
    await server.listen()
    await page.goto(server.resolvedUrls!.local[0])
    const nav = page.getByRole('navigation', { name: '工具导航', exact: true })
    await nav.getByRole('button', { name: '文本工具', exact: true }).click()
    await nav.getByRole('button', { name: /文本对比/ }).click()
    await page.getByLabel('导入左侧原文文件', { exact: true }).setInputFiles({ name: 'application-dev.yaml', mimeType: 'text/yaml', buffer: Buffer.from('server:\n  port: 8080\nlogging:\n  level: debug\n') })
    await page.getByLabel('导入右侧原文文件', { exact: true }).setInputFiles({ name: 'application-prod.yaml', mimeType: 'text/yaml', buffer: Buffer.from('logging:\n  level: info\nserver:\n  port: 9090\n') })
    await page.getByRole('button', { name: '开始比较', exact: true }).click()
    await expect(page.locator('.text-state')).toHaveText(/草稿 · 待处理 \d+ 项/, { timeout: 20_000 })
    await expect(page.getByRole('button', { name: '采用右侧', exact: true })).toBeEnabled()
    await expect(page.locator('.text-feedback')).not.toHaveClass(/is-error/)
    await expect(page.getByRole('textbox', { name: '融合结果', exact: true })).toContainText('8080')
    // Optimizer reloads used to arrive after the worker request and discard this state.
    await page.waitForTimeout(1000)
    expect(navigations).toBe(1)
    await expect(page.locator('.text-state')).toContainText('草稿')
  } finally {
    await page.goto('about:blank')
    await server.close()
  }
})
