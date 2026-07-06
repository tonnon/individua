import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "chamfer-sm inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-display text-sm font-semibold uppercase tracking-wider transition-all outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:shadow-glow-neon hover:brightness-110',
        outline:
          'border border-neon/40 bg-neon/5 text-neon hover:border-neon/70 hover:bg-neon/10 hover:shadow-glow-neon',
        ghost: 'text-ink-dim hover:bg-accent hover:text-ink',
        destructive:
          'bg-destructive/15 text-destructive border border-destructive/40 hover:bg-destructive/25',
        link: 'text-neon underline-offset-4 hover:underline normal-case font-sans font-medium',
      },
      size: {
        default: 'h-10 px-5',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-8',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
