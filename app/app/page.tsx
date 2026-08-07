import Link from "next/link";

export default function Home() {
  return (
    <main className="auth-shell flex min-h-screen items-center justify-center px-6">
      <div className="max-w-[34rem] text-center">
        <div className="sketch rise-in mx-auto flex h-12 w-12 items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 17 17" fill="none" aria-hidden>
            <path
              d="M5.6 8.5l5.4-3.2M5.6 8.5l5.4 3.2"
              stroke="var(--ink-muted)"
              strokeWidth="1.2"
            />
            <circle cx="4" cy="8.5" r="2.1" fill="var(--content-stroke)" />
            <circle cx="12.6" cy="4.6" r="2.1" fill="var(--concept-stroke)" />
            <circle cx="12.6" cy="12.4" r="2.1" fill="#12b886" />
          </svg>
        </div>

        <h1 className="font-hand rise-in mt-8 text-[48px] leading-[1.05] text-[var(--ink)]">
          think in connections
        </h1>

        <div className="rise-in-delayed mt-9 flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="sketch-btn-primary font-hand px-5 py-2 text-[18px]"
          >
            get started
          </Link>
          <Link
            href="/login"
            className="sketch font-hand px-5 py-2 text-[18px] text-[var(--ink)]"
          >
            sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
