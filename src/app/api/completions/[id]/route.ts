import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - 获取单条完成记录详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: completion, error } = await supabase
    .from("task_completions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !completion) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("title, reward_amount, creator_id")
    .eq("id", completion.task_id)
    .single();

  return NextResponse.json({ completion, task: task || null });
}
