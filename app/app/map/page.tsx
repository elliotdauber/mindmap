import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import GraphCanvas from "@/components/graph/GraphCanvas";

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
    <main className="fixed inset-0 overflow-hidden">
      <GraphCanvas
        initialNodes={nodes ?? []}
        initialEdges={edges ?? []}
        userEmail={user.email ?? ""}
      />
    </main>
  );
}
