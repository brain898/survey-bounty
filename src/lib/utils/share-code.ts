import { randomBytes } from "crypto";

export function generateShareCode(): string {
  // 12 字符 base64url，约 72 bits 熵，碰撞概率极低
  return randomBytes(9).toString("base64url").slice(0, 12);
}

// 微信号格式校验：6-20位字母、数字、下划线、短横线
export function isValidWechat(wechat: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/.test(wechat);
}
