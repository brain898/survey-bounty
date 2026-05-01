import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // 只对需要认证的路由和 API 路由做 session 刷新
    // 公开页面（首页 / 填写页）不走中间件，加载更快
    "/dashboard/:path*",
    "/api/:path*",
    "/auth/:path*",
    "/response/:path*",
  ],
};
