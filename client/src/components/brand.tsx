import { cn } from '@/lib/utils';

export const APP_NAME = 'RISK AI NAVIGATOR';
export const APP_TAGLINE = 'Techcombank Risk Management Division';

/**
 * Official Techcombank logo on a transparent background.
 * Dark mode swaps in a copy with white "BANK" lettering
 * (client/public/techcombank-logo-dark.png) so it stays legible.
 * Pass `height` for a fixed height, or omit it to fill the parent's width.
 */
export function TechcombankLogo({
  className,
  height,
}: {
  className?: string;
  height?: number;
}) {
  const sizing = height ? 'w-auto' : 'h-auto w-full';
  const style = height ? { height } : undefined;
  return (
    <>
      <img
        src="/techcombank-logo.png"
        alt="Techcombank"
        style={style}
        className={cn('select-none dark:hidden', sizing, className)}
        draggable={false}
      />
      <img
        src="/techcombank-logo-dark.png"
        alt="Techcombank"
        style={style}
        className={cn('hidden select-none dark:block', sizing, className)}
        draggable={false}
      />
    </>
  );
}

export function AppNameText() {
  return (
    <span className="flex flex-col leading-none">
      <span className="whitespace-nowrap font-extrabold text-[13px] text-brand tracking-[0.1em]">
        {APP_NAME}
      </span>
      <span className="mt-1 whitespace-nowrap text-[10px] text-muted-foreground tracking-wide">
        Risk Management Division
      </span>
    </span>
  );
}

/**
 * Horizontal logo + app name lockup, used on the sign-in screen. The sidebar
 * instead shows a full-width logo with `AppNameText` below it.
 */
export function BrandLockup() {
  return (
    <div className="flex items-center gap-3 overflow-hidden">
      <TechcombankLogo height={40} />
      <span className="border-brand/30 border-l pl-3">
        <AppNameText />
      </span>
    </div>
  );
}

/** Small mark for the collapsed sidebar: two interlocking diamonds. */
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.68}
      viewBox="0 0 66 45"
      aria-hidden="true"
      className="text-brand"
    >
      <path
        fill="currentColor"
        d="M22 0 33 11 22 22 33 33 22 44 0 22ZM44 0 66 22 44 44 33 33 44 22 33 11Z"
      />
    </svg>
  );
}

/**
 * Decorative diamond / chevron shapes inspired by the Techcombank mark.
 * Rendered behind the empty-state hero; purely visual.
 */
export function BrandShapes({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
    >
      {/* Large outlined diamond, top right */}
      <div className="-right-24 -top-24 absolute size-72 rotate-45 rounded-[28px] border-[28px] border-brand/[0.07]" />
      {/* Solid diamond pair, bottom left */}
      <div className="-left-16 absolute bottom-10 size-40 rotate-45 rounded-2xl bg-brand/[0.06]" />
      <div className="absolute bottom-24 left-20 size-20 rotate-45 rounded-lg bg-brand/[0.09]" />
      {/* Small accent diamonds */}
      <div className="absolute top-1/4 left-[12%] size-3 rotate-45 bg-brand/40" />
      <div className="absolute top-[18%] right-[22%] size-2 rotate-45 bg-brand/30" />
      <div className="absolute right-[10%] bottom-1/3 size-4 rotate-45 border-2 border-brand/30" />
    </div>
  );
}
