import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryFilter } from './CategoryFilter'

const categories = ['한식', '일식', '중식']

describe('CategoryFilter', () => {
  it('카테고리 배지 렌더링', () => {
    render(
      <CategoryFilter
        categories={categories}
        selected={[]}
        onChange={() => {}}
      />
    )

    expect(screen.getByText('한식')).toBeDefined()
    expect(screen.getByText('일식')).toBeDefined()
    expect(screen.getByText('중식')).toBeDefined()
  })

  it('카테고리 클릭 시 onChange에 추가', () => {
    const onChange = vi.fn()
    render(
      <CategoryFilter
        categories={categories}
        selected={[]}
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByText('한식'))
    expect(onChange).toHaveBeenCalledWith(['한식'])
  })

  it('이미 선택된 카테고리 클릭 시 제거', () => {
    const onChange = vi.fn()
    render(
      <CategoryFilter
        categories={categories}
        selected={['한식', '일식']}
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByText('한식'))
    expect(onChange).toHaveBeenCalledWith(['일식'])
  })

  it('선택 있을 때 초기화 버튼 표시', () => {
    render(
      <CategoryFilter
        categories={categories}
        selected={['한식']}
        onChange={() => {}}
      />
    )

    expect(screen.getByText('초기화')).toBeDefined()
  })

  it('선택 없을 때 초기화 버튼 미표시', () => {
    render(
      <CategoryFilter
        categories={categories}
        selected={[]}
        onChange={() => {}}
      />
    )

    expect(screen.queryByText('초기화')).toBeNull()
  })

  it('초기화 클릭 시 빈 배열 전달', () => {
    const onChange = vi.fn()
    render(
      <CategoryFilter
        categories={categories}
        selected={['한식', '일식']}
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByText('초기화'))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
