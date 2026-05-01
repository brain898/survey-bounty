import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - 提交完成记录
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const { wechat, proof_screenshot_url } = body;

  if (!wechat?.trim()) {
    return NextResponse.json({ error: "请填写微信号" }, { status: 400 });
  }

  // 查任务
  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("share_code", code)
    .eq("status", "active")
    .single();

  if (!task) {
    return NextResponse.json({ error: "任务不存在或已关闭" }, { status: 404 });
  }

  if (task.current_completions >= task.max_slots) {
    return NextResponse.json({ error: "名额已满" }, { status: 410 });
  }

  // 检查是否已提交过（同一个微信号同一任务只能提交一次）
  const { data: existing } = await supabase
    .from("task_completions")
    .select("id")
    .eq("task_id", task.id)
    .eq("completer_wechat", wechat.trim())
    .single();

  if (existing) {
    return NextResponse.json({ error: "你已经提交过了" }, { status: 409 });
  }

  // 创建完成记录
  const { data: completion, error } = await supabase
    .from("task_completions")
    .insert({
      task_id: task.id,
      completer_wechat: wechat.trim(),
      proof_screenshot_url: proof_screenshot_url || null,
      payment_status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 更新已完成人数，满员自动关闭
  const newCount = task.current_completions + 1;
  const updateData: Record<string, unknown> = { current_completions: newCount };
  if (newCount >= task.max_slots) {
    updateData.status = "full";
  }

  await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", task.id);

  return NextResponse.json({
    success: true,
    completion_id: completion.id,
  });
}
