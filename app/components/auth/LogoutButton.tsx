"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.push("/");
  }

  return (
    <button
      onClick={logout}
      className="rounded-full border border-stone-200/80 bg-white/90 px-4 py-2 text-sm text-stone-600 shadow-sm backdrop-blur-sm transition-colors hover:border-stone-300 hover:bg-stone-50"
    >
      Logout
    </button>
  );
}
