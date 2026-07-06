import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'chamfer-sm flex min-h-16 w-full resize-y border border-input bg-panel-2 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-dim focus-visible:border-neon focus-visible:shadow-glow-neon disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
