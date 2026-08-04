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

  it('shows DES warning and algorithm-specific controls', () => {
    render(<SymmetricCryptoTool algorithm='DES' />)
    expect(screen.getByRole('heading', { name: 'DES 加解密' })).toBeVisible()
    expect(screen.getByText(/DES 已不适合保护新数据/)).toBeVisible()
    expect(screen.getByLabelText('加密模式')).toHaveValue('ECB')
    expect(screen.getByText(/ECB 模式不使用 IV/)).toBeVisible()
  })

  it('renders the SM4 page with its supported modes', () => {
    render(<SymmetricCryptoTool algorithm='SM4' />)
    expect(screen.getByRole('heading', { name: 'SM4 加解密' })).toBeVisible()
    expect(screen.getByLabelText('加密模式')).toHaveTextContent('ECB')
    expect(screen.getByLabelText('加密模式')).toHaveTextContent('CBC')
  })
})
