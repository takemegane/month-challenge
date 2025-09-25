import { hashPassword } from "./crypto";
import { query } from "./db";
import { logger } from "./logger";

const seededEmails = new Set<string>();

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function ensureAdminSeeded() {
  const emails = getAdminEmails();
  if (emails.length === 0) return;

  for (const email of emails) {
    if (seededEmails.has(email)) continue;

    const existing = await query<{ id: string; is_admin: boolean }>`
      select id, is_admin from auth_users where lower(email) = lower(${email})
    `;

    if (existing.length === 0) {
      const password = process.env.ADMIN_DEFAULT_PASSWORD || "password123";
      const passwordHash = hashPassword(password);
      const name = email.split("@")[0] || "管理者";
      await query`
        insert into auth_users (email, password_hash, name, is_admin)
        values (${email}, ${passwordHash}, ${name}, true)
      `;
      logger.info(`Seeded admin user ${email}`);
    } else if (!existing[0].is_admin) {
      await query`
        update auth_users set is_admin = true where id = ${existing[0].id}
      `;
      logger.info(`Updated existing user ${email} to admin`);
    }

    seededEmails.add(email);
  }
}
