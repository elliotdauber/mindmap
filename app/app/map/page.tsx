import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import GraphCanvas from "@/components/graph/GraphCanvas";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function MapPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="h-screen w-screen bg-[#faf7f2]">
      <header className="absolute top-0 right-0 left-0 z-10 flex items-center justify-between p-5">
        <div className="rounded-full border bg-white px-4 py-2 text-sm text-stone-600">
          {user.email}
        </div>

        <LogoutButton />
      </header>

      <GraphCanvas />
    </div>
  );
}
