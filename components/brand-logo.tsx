import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn('size-8', className)}>
      <defs>
        <clipPath id="mi-campo-m">
          <path d="M6 58V18h12l14 20 14-20h12v40H46V36L32 55 18 36v22z" />
        </clipPath>
      </defs>
      <path d="M6 58V18h12l14 20 14-20h12v40H46V36L32 55 18 36v22z" fill="var(--primary)" />
      <g clipPath="url(#mi-campo-m)" fill="none">
        <circle cx="40" cy="78" r="38" stroke="var(--brand-sky)" strokeWidth="10" />
        <circle cx="40" cy="78" r="30" stroke="var(--card)" strokeWidth="6" />
      </g>
      <circle cx="11.5" cy="51.5" r="3" fill="var(--brand-sun)" />
      <path d="M46 16c0-8.5 6.5-14 16-14 0 8.5-6.5 14-16 14z" fill="var(--brand-leaf)" />
    </svg>
  )
}

export function BrandLogo({ className, tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card shadow-sm">
        <BrandMark className="size-8" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-heading text-xl font-extrabold tracking-tight',
            tone === 'light' ? 'text-primary-foreground' : 'text-primary',
          )}
        >
          Mi Campo
        </span>
        <span
          className={cn(
            'mt-1 text-[10px] font-medium uppercase tracking-[0.22em]',
            tone === 'light' ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          Tu campo, en un solo lugar
        </span>
      </span>
    </span>
  )
}
