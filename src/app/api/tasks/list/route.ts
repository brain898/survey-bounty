import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("creator_id", user.id)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  return NextResponse.json({ tasks: tasks || [] });
}
