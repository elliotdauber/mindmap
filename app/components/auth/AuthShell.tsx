import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="auth-shell flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-[22rem]">
        <Link
          href="/"
          className="rise-in inline-flex items-center gap-2.5 text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
        >
          <span className="sketch flex h-8 w-8 items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 17 17" fill="none" aria-hidden>
              <path
                d="M5.6 8.5l5.4-3.2M5.6 8.5l5.4 3.2"
                stroke="var(--ink-muted)"
                strokeWidth="1.2"
              />
              <circle cx="4" cy="8.5" r="2.1" fill="var(--content-stroke)" />
              <circle cx="12.6" cy="4.6" r="2.1" fill="var(--concept-stroke)" />
              <circle cx="12.6" cy="12.4" r="2.1" fill="#12b886" />
            </svg>
          </span>
          <span className="font-hand text-[17px]">mind map</span>
        </Link>

        <h1 className="font-hand rise-in mt-9 text-[38px] leading-tight text-[var(--ink)]">
          {title}
        </h1>
        <p className="rise-in-delayed mt-2 text-[14px] text-[var(--ink-muted)]">
          {subtitle}
        </p>

        <div className="rise-in-delayed mt-8">{children}</div>

        <div className="rise-in-delayed mt-6 text-[12.5px] text-[var(--ink-faint)]">
          {footer}
        </div>
      </div>
    </main>
  );
}

export function AuthField({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="mb-3 block">
      <span className="font-hand mb-1 block text-[15px] text-[var(--ink-muted)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="auth-input w-full px-3.5 py-2.5 text-[14px] text-[var(--ink)] outline-none"
      />
    </label>
  );
}
