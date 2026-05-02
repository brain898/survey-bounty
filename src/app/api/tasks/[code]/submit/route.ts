import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isValidWechat } from "@/lib/utils/share-code";
import { checkRateLimit } from "@/lib/utils/rate-limit";

const ERROR_MAP: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "任务不存在" },
  NOT_ACTIVE: { status: 410, message: "任务已关闭" },
  FULL: { status: 410, message: "名额已满" },
  DUPLICATE: { status: 409, message: "你已经提交过了" },
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  // 速率限制：每个 IP 每分钟最多 10 次提交（完成者未登录，只能用 IP）
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!(await checkRateLimit(`submit:${ip}`, 10, 60_000))) {
    return NextResponse.json({ error: "操作太频繁，请稍后再试" }, { status: 429 });
  }

  const supabase = await createClient();
  const body = await request.json();

  const wechat = body.wechat?.trim();
  const proof_screenshot_url = body.proof_screenshot_url || null;

  if (!wechat) {
    return NextResponse.json({ error: "请填写微信号" }, { status: 400 });
  }

  if (!isValidWechat(wechat)) {
    return NextResponse.json(
      { error: "微信号格式不正确（6-20位，以字母开头，只能包含字母、数字、下划线、短横线）" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("submit_task_completion", {
    p_share_code: code,
    p_wechat: wechat,
    p_proof_url: proof_screenshot_url,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (row?.error_code) {
    const mapped = ERROR_MAP[row.error_code] || {
      status: 500,
      message: "提交失败",
    };
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({
    success: true,
    completion_id: row.completion_id,
  });
}
