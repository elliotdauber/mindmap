"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthField, AuthShell } from "@/components/auth/AuthShell";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function login() {
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setPending(false);
      return;
    }

    router.push("/map");
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Pick up where your thinking left off."
      footer={
        <>
          No account yet?{" "}
          <Link href="/signup" className="text-[var(--content-stroke)] hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void login();
        }}
      >
        <AuthField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <AuthField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        {error && (
          <p className="mt-1 mb-3 text-[13px] text-[var(--edge-live)]">{error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="sketch-btn-primary font-hand mt-2 w-full py-2.5 text-[18px] disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
