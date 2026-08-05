import { render, screen, within } from '@testing-library/react'
import { DEFAULT_TOOL_AVAILABILITY, getEnabledToolGroups } from '../../shell/toolRegistry'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('introduces all six local tool categories', () => {
    render(<HomePage />)
    const homepage = screen.getByRole('region', { name: '开发者工具箱' })
    expect(within(homepage).getByText('完全本地处理')).toBeVisible()
    expect(within(homepage).getByText('输入、密钥与结果不会离开当前浏览器')).toBeVisible()
    expect(within(homepage).getAllByRole('article')).toHaveLength(6)
    for (const name of ['随机数工具', '对称加密', '非对称加密', '摘要算法', '时间工具', '编码工具']) {
      expect(within(homepage).getByRole('heading', { name })).toBeVisible()
    }
    expect(within(homepage).getByText('MD5 · SHA')).toBeVisible()
    expect(within(homepage).getByText('AES · SM4')).toBeVisible()
    expect(within(homepage).getByText('URL 编解码 · Unicode · Base64 · JWT · JSON')).toBeVisible()
  })

  it('uses the enabled directory and omits empty categories', () => {
    const groups = getEnabledToolGroups({
      ...DEFAULT_TOOL_AVAILABILITY,
      des: true,
      rsa: false,
      json: false,
    })
    render(<HomePage groups={groups} />)
    const homepage = screen.getByRole('region', { name: '开发者工具箱' })
    expect(within(homepage).getByText('AES · DES · SM4')).toBeVisible()
    expect(within(homepage).queryByRole('heading', { name: '非对称加密' })).not.toBeInTheDocument()
    expect(within(homepage).getByText('URL 编解码 · Unicode · Base64 · JWT')).toBeVisible()
  })

  it.each([320, 390])('keeps the introduction available at %ipx', (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
    render(<HomePage />)
    expect(screen.getByRole('region', { name: '开发者工具箱' })).toBeVisible()
    expect(screen.getByRole('heading', { name: '工具一览' })).toBeVisible()
  })
})
