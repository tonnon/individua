import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'chamfer-sm flex h-10 w-full border border-input bg-panel-2 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-dim focus-visible:border-neon focus-visible:shadow-glow-neon disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
