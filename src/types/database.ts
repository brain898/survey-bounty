// ============================================================
// 通用悬赏平台 - Supabase 数据库类型定义
// 与 supabase/migrations/003_rebuild_tasks.sql 保持同步
// ============================================================

export type TaskStatus = "active" | "full" | "closed" | "deleted";
export type CompletionStatus =
  | "pending"    // 待审核
  | "verified"   // 已审核，等打款
  | "paid"       // 已付款
  | "confirmed"  // 已确认收到
  | "disputed";  // 争议中

export type UserRole = "publisher" | "filler";

export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  task_image_url: string | null;
  external_link: string | null;
  reward_amount: number;   // 分
  max_slots: number;
  current_completions: number;
  status: TaskStatus;
  share_code: string;
  created_at: string;
  updated_at: string;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  completer_wechat: string;
  proof_screenshot_url: string | null;
  payment_status: CompletionStatus;
  paid_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditScore {
  user_id: string;
  total_surveys: number;
  completed_payments: number;
  disputed_count: number;
  credit_score: number;
  updated_at: string;
}

// ============================================================
// Supabase Database 类型
// ============================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "current_completions" | "created_at" | "updated_at">;
        Update: Partial<Omit<Task, "id" | "creator_id" | "created_at">>;
      };
      task_completions: {
        Row: TaskCompletion;
        Insert: Omit<TaskCompletion, "id" | "paid_at" | "confirmed_at" | "disputed_at" | "created_at" | "updated_at">;
        Update: Partial<Omit<TaskCompletion, "id" | "task_id" | "created_at">>;
      };
      credit_scores: {
        Row: CreditScore;
        Insert: Omit<CreditScore, "updated_at">;
        Update: Partial<Omit<CreditScore, "user_id">>;
      };
    };
  };
}
