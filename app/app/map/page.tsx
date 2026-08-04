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

  const [{ data: nodes }, { data: edges }] = await Promise.all([
    supabase.from("nodes").select("*").order("created_at"),
    supabase.from("edges").select("*"),
  ]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#faf7f2]">
      <header className="pointer-events-none absolute top-0 right-0 left-0 z-10 flex items-center justify-between px-6 py-5">
        <div className="pointer-events-auto flex items-center gap-3">
          <span className="text-sm font-medium tracking-tight text-stone-700">
            Mind Map
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          <div className="rounded-full border border-stone-200/80 bg-white/90 px-4 py-2 text-sm text-stone-500 shadow-sm backdrop-blur-sm">
            {user.email}
          </div>
          <LogoutButton />
        </div>
      </header>

      <GraphCanvas
        initialNodes={nodes ?? []}
        initialEdges={edges ?? []}
      />
    </div>
  );
}
