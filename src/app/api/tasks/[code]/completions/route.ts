import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - 获取任务的所有完成记录（仅发布者可见）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("share_code", code)
    .eq("creator_id", user.id)
    .single();

  if (!task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const { data: completions } = await supabase
    .from("task_completions")
    .select("*")
    .eq("task_id", task.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ task, completions: completions || [] });
}
