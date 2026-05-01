import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateShareCode } from "@/lib/utils/share-code";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, task_image_url, external_link, reward_amount, max_slots } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "请填写任务标题" }, { status: 400 });
  }
  if (!reward_amount || reward_amount <= 0) {
    return NextResponse.json({ error: "请设置赏金金额" }, { status: 400 });
  }
  if (!max_slots || max_slots <= 0) {
    return NextResponse.json({ error: "请设置名额" }, { status: 400 });
  }

  const shareCode = generateShareCode();

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      creator_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      task_image_url: task_image_url || null,
      external_link: external_link?.trim() || null,
      reward_amount: Math.round(reward_amount * 100),
      max_slots: parseInt(max_slots),
      status: "active",
      share_code: shareCode,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, task: { id: task.id, share_code: task.share_code } });
}
