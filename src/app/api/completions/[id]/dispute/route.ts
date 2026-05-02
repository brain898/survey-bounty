import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - 完成者举报未收到（paid → dispute_pending）
// 举报进入待仲裁状态，不直接扣信用分
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // 鉴权：必须登录
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { data: completion, error: fetchError } = await supabase
    .from("task_completions")
    .select("id, payment_status, task_id, tasks!inner(creator_id)")
    .eq("id", id)
    .single();

  if (fetchError || !completion) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  // tasks join 可能返回数组或对象，兼容处理
  const task = Array.isArray(completion.tasks) ? completion.tasks[0] : completion.tasks;
  const creatorId = task?.creator_id;

  // 鉴权：只有任务发布者才能操作
  if (creatorId !== user.id) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  if (completion.payment_status !== "paid") {
    return NextResponse.json({ error: "状态不正确：只有标记付款后才能举报" }, { status: 400 });
  }

  // 改为 dispute_pending（待仲裁），不直接扣信用分
  const { error } = await supabase
    .from("task_completions")
    .update({
      payment_status: "dispute_pending",
      disputed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "举报已提交，等待平台仲裁" });
}
