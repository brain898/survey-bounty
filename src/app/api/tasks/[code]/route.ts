import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - 获取任务详情（公开，填写者看到的）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: task, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("share_code", code)
    .in("status", ["active", "full", "closed"])
    .single();

  // task 不存在时直接返回，不再做第二次查询
  if (error || !task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  // 只在 task 存在时才查信用分
  const { data: credit } = await supabase
    .from("credit_scores")
    .select("credit_score, total_surveys, completed_payments")
    .eq("user_id", task.creator_id)
    .single();

  return NextResponse.json({ task, credit: credit || null });
}
