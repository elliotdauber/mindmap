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
      className="rounded-full border bg-white px-4 py-2 text-sm text-stone-600 hover:bg-stone-100"
    >
      Logout
    </button>
  );
}
