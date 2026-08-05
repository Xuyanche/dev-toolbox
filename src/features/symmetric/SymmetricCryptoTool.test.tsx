import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SymmetricCryptoTool } from './SymmetricCryptoTool'

describe('SymmetricCryptoTool', () => {
  it('encrypts and decrypts AES text with the same parameters', async () => {
    const user = userEvent.setup()
    render(<SymmetricCryptoTool algorithm='AES' />)
    await user.type(screen.getByLabelText('密钥'), '000102030405060708090a0b0c0d0e0f')
    await user.type(screen.getByLabelText('IV / 偏移量'), '101112131415161718191a1b1c1d1e1f')
    await user.type(screen.getByLabelText('明文（UTF-8）'), '你好 AES')
    await user.click(screen.getByRole('button', { name: '开始加密' }))
    expect(await screen.findByText(/AES 加密完成/)).toBeVisible()
    const ciphertext = (screen.getByLabelText('处理结果') as HTMLTextAreaElement).value
    expect(ciphertext).not.toBe('')

    await user.click(screen.getByLabelText('解密'))
    await user.type(screen.getByLabelText('密文（Base64）'), ciphertext)
    await user.click(screen.getByRole('button', { name: '开始解密' }))
    expect(await screen.findByText(/AES 解密完成/)).toBeVisible()
    expect(screen.getByLabelText('处理结果')).toHaveValue('你好 AES')
  })

  it('updates compatible parameters when AES mode changes', async () => {
    const user = userEvent.setup()
    render(<SymmetricCryptoTool algorithm='AES' />)
    await user.selectOptions(screen.getByLabelText('加密模式'), 'GCM')
    expect(screen.getByLabelText('填充模式')).toBeDisabled()
    expect(screen.getByLabelText('Nonce / 偏移量')).toBeVisible()
    expect(screen.queryByLabelText('IV / 偏移量')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('加密模式'), 'ECB')
    expect(screen.getByLabelText('IV / 偏移量')).toBeDisabled()
    expect(screen.getByLabelText('IV / 偏移量')).toHaveValue('')
    expect(screen.getByText('IV / 偏移量格式').closest('fieldset')).toBeDisabled()
    expect(screen.queryByText('无需偏移量')).not.toBeInTheDocument()
  })

  it('reports GCM authentication and validation failures', async () => {
    const user = userEvent.setup()
    render(<SymmetricCryptoTool algorithm='AES' />)
    await user.selectOptions(screen.getByLabelText('加密模式'), 'GCM')
    await user.click(screen.getByLabelText('解密'))
    await user.type(screen.getByLabelText('密钥'), '00000000000000000000000000000000')
    await user.type(screen.getByLabelText('Nonce / 偏移量'), '000000000000000000000000')
    await user.type(screen.getByLabelText('密文（Base64）'), 'AAAAAAAAAAAAAAAAAAAAAA==')
    await user.click(screen.getByRole('button', { name: '开始解密' }))
    expect(await screen.findByText(/密码操作失败/)).toBeVisible()
    expect(screen.getByLabelText('处理结果')).toHaveValue('')
  })

  it('shows DES warning and a disabled IV field for ECB', () => {
    render(<SymmetricCryptoTool algorithm='DES' />)
    expect(screen.getByRole('heading', { name: 'DES 加解密' })).toBeVisible()
    expect(screen.getByText(/DES 已不适合保护新数据/)).toBeVisible()
    expect(screen.getByLabelText('加密模式')).toHaveValue('ECB')
    expect(screen.getByLabelText('IV / 偏移量')).toBeDisabled()
    expect(screen.getByLabelText('IV / 偏移量')).toHaveAttribute('placeholder', 'ECB 模式不使用偏移量')
    expect(screen.queryByText('无需偏移量')).not.toBeInTheDocument()
  })

  it('renders the SM4 page with its supported modes', () => {
    render(<SymmetricCryptoTool algorithm='SM4' />)
    expect(screen.getByRole('heading', { name: 'SM4 加解密' })).toBeVisible()
    expect(screen.getByLabelText('加密模式')).toHaveTextContent('ECB')
    expect(screen.getByLabelText('加密模式')).toHaveTextContent('CBC')
  })

  it('aligns text fields and provides complete copy and input deletion actions', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<SymmetricCryptoTool algorithm='AES' />)

    const input = screen.getByLabelText('明文（UTF-8）')
    const output = screen.getByLabelText('处理结果')
    expect(input.closest('.symmetric-text-field')).not.toBeNull()
    expect(output.closest('.symmetric-text-field')).not.toBeNull()
    expect(input.closest('.panel')?.querySelector('.panel-heading button')).toBeNull()
    expect(output.closest('.panel')?.querySelector('.panel-heading button')).toBeNull()

    await user.type(input, '完整明文')
    await user.click(screen.getByRole('button', { name: '复制明文输入' }))
    expect(writeText).toHaveBeenLastCalledWith('完整明文')
    expect(await screen.findByText('明文输入已复制到剪贴板。')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '删除明文输入' }))
    expect(input).toHaveValue('')
    expect(screen.getByLabelText('加密模式')).toHaveValue('CBC')
  })

  it('encrypts and decrypts AES-ECB without an IV', async () => {
    const user = userEvent.setup()
    render(<SymmetricCryptoTool algorithm='AES' />)
    await user.selectOptions(screen.getByLabelText('加密模式'), 'ECB')
    await user.type(screen.getByLabelText('密钥'), '000102030405060708090a0b0c0d0e0f')
    await user.type(screen.getByLabelText('明文（UTF-8）'), 'AES ECB')
    await user.click(screen.getByRole('button', { name: '开始加密' }))
    const ciphertext = (screen.getByLabelText('处理结果') as HTMLTextAreaElement).value
    expect(ciphertext).not.toBe('')
    expect(await screen.findByText(/AES 加密完成/)).toBeVisible()

    await user.click(screen.getByLabelText('解密'))
    await user.type(screen.getByLabelText('密文（Base64）'), ciphertext)
    await user.click(screen.getByRole('button', { name: '开始解密' }))
    expect(screen.getByLabelText('处理结果')).toHaveValue('AES ECB')
  })

  it('keeps icon actions attached to both fields on a narrow viewport and reports copy failure', async () => {
    const user = userEvent.setup()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    render(<SymmetricCryptoTool algorithm='SM4' />)
    await user.type(screen.getByLabelText('明文（UTF-8）'), '窄屏')
    await user.click(screen.getByRole('button', { name: '复制明文输入' }))
    expect(await screen.findByText('无法访问剪贴板，请手动复制明文输入。')).toBeVisible()
    expect(document.querySelector('.crypto-io')?.querySelectorAll('.symmetric-text-field')).toHaveLength(2)
    expect(screen.getByRole('button', { name: '复制明文输入' }).closest('.field-heading')).not.toBeNull()
    expect(screen.getByRole('button', { name: '删除明文输入' }).closest('.field-heading')).not.toBeNull()
    expect(screen.getByRole('button', { name: '复制处理结果' })).toBeDisabled()
  })
})
