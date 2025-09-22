import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${key}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, key] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const derived = scryptSync(password, salt, 64).toString("hex");
  try {
    return timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(key, "hex"));
  } catch { return false; }
}

const b64url = (b: Buffer) => b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

export function signToken(payload: Record<string, any>, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const enc = (o: any) => b64url(Buffer.from(JSON.stringify(o)));
  const data = `${enc(header)}.${enc(payload)}`;
  const sig = createHmac("sha256", secret).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

export function verifyToken(token: string, secret: string): { valid: boolean; payload?: any } {
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false };
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const sig = createHmac("sha256", secret).update(data).digest();
  const target = Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + "=", "base64");
  if (!timingSafeEqual(sig, target)) return { valid: false };
  try {
    const payload = JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    if (payload.exp && Date.now() / 1000 > payload.exp) return { valid: false };
    return { valid: true, payload };
  } catch { return { valid: false }; }
}

