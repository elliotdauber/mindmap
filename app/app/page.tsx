import Link from "next/link";

export default function Home() {
  return (
    <main className="auth-shell flex min-h-screen items-center justify-center px-6">
      <div className="max-w-[34rem] text-center">
        <div className="glass rise-in mx-auto flex h-12 w-12 items-center justify-center rounded-2xl">
          <svg width="22" height="22" viewBox="0 0 17 17" fill="none" aria-hidden>
            <path
              d="M5.6 8.5l5.4-3.2M5.6 8.5l5.4 3.2"
              stroke="#8c8a85"
              strokeWidth="1"
            />
            <circle cx="4" cy="8.5" r="2.1" fill="#a9bcff" />
            <circle cx="12.6" cy="4.6" r="2.1" fill="#f5c14e" />
            <circle cx="12.6" cy="12.4" r="2.1" fill="#5eead4" />
          </svg>
        </div>

        <h1 className="font-display rise-in mt-8 text-[44px] leading-[1.1] text-[#f2f1ee]">
          Think in connections
        </h1>

        <p className="rise-in-delayed mx-auto mt-4 max-w-[26rem] text-[14.5px] leading-relaxed text-[#8d8b86]">
          Capture content and the concepts behind it. The map arranges itself, so
          all you do is write and link.
        </p>

        <div className="rise-in-delayed mt-9 flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-xl bg-[#f2f1ee] px-5 py-2.5 text-[13.5px] font-medium text-[#0b0d10] transition-all hover:bg-white active:scale-[0.98]"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="glass glass-button rounded-xl px-5 py-2.5 text-[13.5px] font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
