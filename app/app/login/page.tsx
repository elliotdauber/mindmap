"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
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
        <h1 className="text-3xl font-semibold text-stone-800">Welcome back</h1>

        <input
          className="mt-8 w-full rounded-xl border p-3"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="mt-3 w-full rounded-xl border p-3"
          placeholder="Password"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="mt-5 w-full rounded-xl bg-stone-900 py-3 text-white"
        >
          Login
        </button>
      </div>
    </div>
  );
}
