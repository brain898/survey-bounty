import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - 获取单条完成记录详情（仅任务发布者可见）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // 必须登录
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  // 通过 join 拿到任务信息，验证当前用户是发布者
  const { data: completion, error } = await supabase
    .from("task_completions")
    .select("*, tasks!inner(id, title, reward_amount, creator_id)")
    .eq("id", id)
    .single();

  if (error || !completion) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  // 权限校验：只有任务发布者能查看完成记录详情（含微信号）
  if (completion.tasks.creator_id !== user.id) {
    return NextResponse.json({ error: "无权限查看" }, { status: 403 });
  }

  return NextResponse.json({
    completion,
    task: {
      title: completion.tasks.title,
      reward_amount: completion.tasks.reward_amount,
      creator_id: completion.tasks.creator_id,
    },
  });
}
