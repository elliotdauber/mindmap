"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthField, AuthShell } from "@/components/auth/AuthShell";

export default function Signup() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signup() {
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
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
      title="Start a map"
      subtitle="A quiet place to connect what you're learning."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="text-[var(--content-stroke)] hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void signup();
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
          autoComplete="new-password"
        />

        {error && (
          <p className="mt-1 mb-3 text-[13px] text-[var(--edge-live)]">{error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="sketch-btn-primary font-hand mt-2 w-full py-2.5 text-[18px] disabled:opacity-60"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
