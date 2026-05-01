import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - 完成者举报未收到（paid → disputed）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: completion, error: fetchError } = await supabase
    .from("task_completions")
    .select("*, tasks!inner(creator_id)")
    .eq("id", id)
    .single();

  if (fetchError || !completion) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  if (completion.payment_status !== "paid") {
    return NextResponse.json({ error: "状态不正确" }, { status: 400 });
  }

  const { error } = await supabase
    .from("task_completions")
    .update({
      payment_status: "disputed",
      disputed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 发布者信用分 -20
  await supabase.rpc("decrement_credit", { p_user_id: completion.tasks.creator_id });

  return NextResponse.json({ success: true });
}
