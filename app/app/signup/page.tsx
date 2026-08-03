"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Signup() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function signup() {
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/map");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf7f2]">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-semibold text-stone-800">
          Create account
        </h1>

        <input
          className="mt-8 w-full rounded-xl border p-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="mt-3 w-full rounded-xl border p-3"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={signup}
          className="mt-5 w-full rounded-xl bg-stone-900 py-3 text-white"
        >
          Create account
        </button>

        <p className="mt-5 text-sm text-stone-400">
          Already registered?{" "}
          <a href="/login" className="underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
