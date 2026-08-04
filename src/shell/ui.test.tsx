import { render, screen } from '@testing-library/react'
import { TextAreaField } from './ui'

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
