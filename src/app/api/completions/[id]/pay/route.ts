import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - 发布者标记已付款（verified → paid）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { data: completion } = await supabase
    .from("task_completions")
    .select("*, tasks!inner(creator_id)")
    .eq("id", id)
    .single();

  if (!completion || completion.tasks.creator_id !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  if (completion.payment_status !== "verified") {
    return NextResponse.json({ error: "请先审核通过" }, { status: 400 });
  }

  const { error } = await supabase
    .from("task_completions")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
