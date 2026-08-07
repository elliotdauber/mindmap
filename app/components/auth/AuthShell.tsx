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
          className="rise-in inline-flex items-center gap-2.5 text-[#a3a19c] transition-colors hover:text-[#f2f1ee]"
        >
          <span className="glass flex h-8 w-8 items-center justify-center rounded-lg">
            <svg width="15" height="15" viewBox="0 0 17 17" fill="none" aria-hidden>
              <path
                d="M5.6 8.5l5.4-3.2M5.6 8.5l5.4 3.2"
                stroke="#8c8a85"
                strokeWidth="1"
              />
              <circle cx="4" cy="8.5" r="2.1" fill="#a9bcff" />
              <circle cx="12.6" cy="4.6" r="2.1" fill="#f5c14e" />
              <circle cx="12.6" cy="12.4" r="2.1" fill="#5eead4" />
            </svg>
          </span>
          <span className="text-[13px] font-medium">Mind Map</span>
        </Link>

        <h1 className="font-display rise-in mt-9 text-[32px] leading-tight text-[#f2f1ee]">
          {title}
        </h1>
        <p className="rise-in-delayed mt-2 text-[13.5px] text-[#8d8b86]">
          {subtitle}
        </p>

        <div className="rise-in-delayed mt-8">{children}</div>

        <div className="rise-in-delayed mt-6 text-[12.5px] text-[#75736f]">
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
      <span className="mb-1.5 block text-[11px] font-medium tracking-[0.08em] text-[#75736f] uppercase">
        {label}
      </span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="auth-input w-full rounded-xl px-3.5 py-2.5 text-[14px] text-[#f2f1ee] outline-none"
      />
    </label>
  );
}
