import { fireEvent, render, screen } from '@testing-library/react'
import { FieldIconButton, TextAreaField } from './ui'

describe('TextAreaField', () => {
  it('keeps a shared heading structure and preserves optional bottom hints', () => {
    const { rerender } = render(
      <TextAreaField label="测试字段" value="" hint="底部提示" onChange={() => undefined} />,
    )

    const textarea = screen.getByLabelText('测试字段')
    const field = textarea.closest('label')
    expect(field?.querySelector('.field-heading')).toContainElement(screen.getByText('测试字段'))
    expect(field?.querySelector('.field-heading-aside')).toBeNull()
    expect(field?.querySelector('.field-hint')).toHaveTextContent('底部提示')
    expect(textarea.nextElementSibling).toHaveClass('field-hint')

    rerender(<TextAreaField label="测试字段" value="" onChange={() => undefined} />)
    expect(screen.getByLabelText('测试字段')).toBeInTheDocument()
    expect(screen.queryByText('底部提示')).not.toBeInTheDocument()
  })
})

describe('FieldIconButton', () => {
  it('provides shared accessible copy and delete icon controls', () => {
    const onCopy = vi.fn()
    const { rerender } = render(<FieldIconButton kind="copy" label="复制字段" onClick={onCopy} />)
    const copy = screen.getByRole('button', { name: '复制字段' })
    expect(copy).toHaveAttribute('title', '复制字段')
    expect(copy).toHaveClass('field-heading-icon-button', 'field-copy-button')
    expect(copy.querySelector('svg.field-copy-icon')).not.toBeNull()
    fireEvent.click(copy)
    expect(onCopy).toHaveBeenCalledOnce()

    rerender(<FieldIconButton kind="delete" label="删除字段" disabled onClick={vi.fn()} />)
    const remove = screen.getByRole('button', { name: '删除字段' })
    expect(remove).toBeDisabled()
    expect(remove).toHaveClass('field-delete-button')
    expect(remove.querySelector('svg.field-delete-icon')).not.toBeNull()
  })
})
