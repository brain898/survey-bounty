import { randomBytes } from "crypto";

export function generateShareCode(): string {
  return randomBytes(4).toString("base64url").slice(0, 8);
}
