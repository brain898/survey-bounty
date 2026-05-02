import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - 发布者确认已付款，完成者确认收款（paid → confirmed）
// 用事务 RPC 保证「状态更新 + 信用分加减」原子性
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
    return NextResponse.json({ error: "状态不正确：只有标记付款后才能确认" }, { status: 400 });
  }

  // 调用事务 RPC：原子性更新状态 + 加信用分
  const { data, error } = await supabase.rpc("confirm_payment_transaction", {
    p_completion_id: id,
    p_creator_id: creatorId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (row?.error_code) {
    return NextResponse.json({ error: "状态冲突，请刷新重试" }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
