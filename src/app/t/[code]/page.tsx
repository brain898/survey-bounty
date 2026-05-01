"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { uploadImage } from "@/lib/supabase/storage";
import type { Task, CreditScore } from "@/types/database";

export default function TaskFillPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [task, setTask] = useState<Task | null>(null);
  const [credit, setCredit] = useState<CreditScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wechat, setWechat] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [completionId, setCompletionId] = useState("");

  useEffect(() => {
    fetch(`/api/tasks/${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else { setTask(data.task); setCredit(data.credit); }
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [code]);

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("截图不能超过 5MB"); return; }
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!wechat.trim()) { setError("请填写微信号"); return; }
    if (!proofFile) { setError("请上传完成截图"); return; }

    setSubmitting(true);
    try {
      const proofUrl = await uploadImage(proofFile, "task-images", "proofs");

      const res = await fetch(`/api/tasks/${code}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wechat, proof_screenshot_url: proofUrl }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "提交失败"); return; }

      setCompletionId(data.completion_id);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-8 pb-6 text-center">
            <p className="text-5xl mb-4">😔</p>
            <p className="text-lg font-semibold">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">请联系任务发布者</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-8 pb-6 text-center">
            <p className="text-5xl mb-4">🎉</p>
            <p className="text-xl font-semibold">提交成功！</p>
            <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-950/30 p-4">
              <p className="text-sm text-green-700 dark:text-green-400">
                赏金 <strong className="text-lg">{((task?.reward_amount || 0) / 100).toFixed(2)}</strong> 元
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                审核通过后通过微信红包转账
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              记录编号：{completionId}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!task) return null;

  // 已满或已关闭
  if (task.status === "full" || task.status === "closed") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-8 pb-6 text-center">
            <p className="text-5xl mb-4">{task.status === "full" ? "🎯" : "🔒"}</p>
            <p className="text-xl font-semibold">
              {task.status === "full" ? "名额已满" : "任务已关闭"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {task.status === "full"
                ? "所有名额已被领取，下次手速快一点"
                : "发布者已关闭此任务"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remaining = task.max_slots - task.current_completions;

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:py-10">
      {/* 任务头部 */}
      <Card className="mb-5">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-xl sm:text-2xl leading-tight flex-1">{task.title}</CardTitle>
            <Badge variant="secondary" className="shrink-0 text-sm px-3 py-1 font-semibold">
              ¥{(task.reward_amount / 100).toFixed(2)}
            </Badge>
          </div>
          {task.description && (
            <CardDescription className="mt-2 text-sm leading-relaxed">{task.description}</CardDescription>
          )}
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              剩余 {remaining} 个名额
            </span>
            {credit && (
              <span className="flex items-center gap-1">
                信用
                <Badge
                  variant={credit.credit_score >= 80 ? "default" : "destructive"}
                  className="text-xs px-1.5 py-0"
                >
                  {credit.credit_score}
                </Badge>
              </span>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* 任务截图 */}
      {task.task_image_url && (
        <Card className="mb-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">任务详情</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={task.task_image_url}
              alt="任务截图"
              className="w-full rounded-lg border"
              loading="lazy"
            />
          </CardContent>
        </Card>
      )}

      {/* 外部链接 */}
      {task.external_link && (
        <Card className="mb-5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">第 1 步：完成任务</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{task.external_link}</p>
              </div>
              <a href={task.external_link} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="shrink-0">打开链接</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="my-5" />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 提交表单 */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm font-medium text-muted-foreground">
          {task.external_link ? "第 2 步：" : ""}上传完成截图
        </p>

        {/* 完成截图 */}
        <Card>
          <CardContent className="pt-5">
            <div className="space-y-3">
              <Label className="text-sm font-medium">完成截图 *</Label>
              <p className="text-xs text-muted-foreground">
                截图证明你已完成任务（如问卷星「已完成」页面）
              </p>
              <div className="flex items-start gap-3">
                <label className="flex-1 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                  {proofPreview ? (
                    <img src={proofPreview} alt="预览" className="h-24 w-24 rounded object-cover" />
                  ) : (
                    <>
                      <svg className="h-8 w-8 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 16V8m0 0l-3 3m3-3l3 3" strokeLinecap="round" strokeLinejoin="round" />
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                      </svg>
                      <span className="text-xs text-muted-foreground">点击上传截图</span>
                    </>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleProofChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 微信号 */}
        <Card>
          <CardContent className="pt-5">
            <div className="space-y-2">
              <Label htmlFor="wechat" className="text-sm font-medium">微信号 *</Label>
              <Input
                id="wechat"
                placeholder="你的微信号"
                value={wechat}
                onChange={(e) => setWechat(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                发布者审核通过后通过微信红包给你转账
              </p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-12 text-base" size="lg" disabled={submitting}>
          {submitting ? "提交中..." : "提交完成"}
        </Button>
      </form>
    </div>
  );
}
