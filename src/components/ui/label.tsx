import * as React from 'react'

import { cn } from '@/lib/utils'

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      className={cn(
        'mb-1.5 block font-mono text-xs tracking-wider text-ink-dim uppercase',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
