import { cn } from '@/lib/utils'

describe('cn', () => {
  it('mescla classes condicionais', () => {
    expect(cn('a', { b: false }, 'c')).toBe('a c')
  })

  it('resolve conflitos do tailwind mantendo a última', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
