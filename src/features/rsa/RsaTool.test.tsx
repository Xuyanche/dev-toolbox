import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RsaTool } from './RsaTool'
import { RSA_PLAINTEXT_LIMIT } from './rsa'

describe('RSA tool layout', () => {
  it('places the plaintext byte count in the field heading instead of a bottom hint', () => {
    render(<RsaTool />)

    const plaintext = screen.getByLabelText('明文')
    const field = plaintext.closest('label')
    const heading = field?.querySelector('.field-heading')

    expect(field).not.toBeNull()
    expect(heading).not.toBeNull()
    expect(within(heading as HTMLElement).getByText('明文')).toBeVisible()
    expect(within(heading as HTMLElement).getByText(`0 / ${RSA_PLAINTEXT_LIMIT} 字节`)).toBeVisible()
    expect(field?.querySelector('.field-hint')).toBeNull()
    expect(heading?.nextElementSibling).toBe(plaintext)
  })

  it('updates UTF-8 bytes, marks overflow, and disables encryption over the limit', async () => {
    const user = userEvent.setup()
    render(<RsaTool />)

    const publicKey = screen.getByLabelText('SPKI 公钥 PEM')
    const plaintext = screen.getByLabelText('明文')
    const encryptButton = screen.getByRole('button', { name: '公钥加密' })

    await user.type(publicKey, 'key')
    await user.type(plaintext, '你')
    expect(screen.getByText(`3 / ${RSA_PLAINTEXT_LIMIT} 字节`)).not.toHaveClass('danger-text')
    expect(encryptButton).toBeEnabled()

    await user.clear(plaintext)
    await user.type(plaintext, 'a'.repeat(RSA_PLAINTEXT_LIMIT + 1))
    expect(screen.getByText(`${RSA_PLAINTEXT_LIMIT + 1} / ${RSA_PLAINTEXT_LIMIT} 字节`)).toHaveClass('danger-text')
    expect(encryptButton).toBeDisabled()
  })
})
