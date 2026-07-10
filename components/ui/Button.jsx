'use client';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const styles = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white hover:bg-accent/90',
        ghost: 'bg-line/60 text-ink hover:bg-line',
        outline: 'border border-line bg-surface text-ink hover:border-accent/40'
      },
      size: { md: 'h-10 px-4 text-sm', sm: 'h-8 px-3 text-xs' }
    },
    defaultVariants: { variant: 'primary', size: 'md' }
  }
);

export function Button({ className, variant, size, ...props }) {
  return <button className={cn(styles({ variant, size }), className)} {...props} />;
}
