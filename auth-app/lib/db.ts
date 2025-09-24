import { hashPassword } from "./crypto";
import { getRedisClient } from "./redis";

const DATABASE_URL = process.env.DATABASE_URL_AUTH || process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL;
const useRedis = !!REDIS_URL;
const useMock = !DATABASE_URL && !REDIS_URL;
let neonClient: (<T>(strings: TemplateStringsArray, ...values: any[]) => Promise<T[]>) | null = null;

async function getNeonClient() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL_AUTH (or DATABASE_URL) is not set");
  }
  if (!neonClient) {
    const { neon } = await import("@neondatabase/serverless");
    neonClient = neon(DATABASE_URL);
  }
  return neonClient;
}

// ---- In-memory fallback (used only when DATABASE_URL is missing) ----

declare global {
  // eslint-disable-next-line no-var
  var globalUsers: Array<{
    id: string;
    email: string;
    password_hash: string;
    name: string;
    is_admin: boolean;
  }> | undefined;
  // eslint-disable-next-line no-var
  var globalEntries: Array<{
    id: string;
    user_id: string;
    entry_date: string;
    created_at: string;
  }> | undefined;
}

if (useMock && !globalThis.globalUsers) {
  globalThis.globalUsers = [];
}

if (useMock && !globalThis.globalEntries) {
  globalThis.globalEntries = [];
}

async function ensureDefaultAdmin() {
  if (useRedis) {
    const redis = await getRedisClient();
    const existingAdmin = await redis.hGetAll("user:admin@example.com");
    if (!existingAdmin.id) {
      const admin = {
        id: "admin-default",
        email: "admin@example.com",
        password_hash: hashPassword("password123"),
        name: "管理者",
        is_admin: "true",
      };
      await redis.hSet("user:admin@example.com", admin);
      await redis.hSet("user_by_id:admin-default", admin);
    }
    return;
  }

  if (!useMock) return;
  if (!globalThis.globalUsers) {
    globalThis.globalUsers = [];
  }
  const existingAdmin = globalThis.globalUsers.find((u) => u.email === "admin@example.com");
  if (!existingAdmin) {
    globalThis.globalUsers.push({
      id: "admin-default",
      email: "admin@example.com",
      password_hash: hashPassword("password123"),
      name: "管理者",
      is_admin: true,
    });
  }
}

async function getUsers() {
  await ensureDefaultAdmin();
  return globalThis.globalUsers!;
}

function getEntries() {
  return globalThis.globalEntries!;
}

async function mockQuery<T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]> {
  const sql = strings.join("?").trim().toLowerCase();

  if (sql.includes("select") && sql.includes("from auth_users")) {
    if (sql.includes("where lower(email)")) {
      const email = String(values[0] || "").toLowerCase();
      const users = await getUsers();
      const user = users.find((u) => u.email.toLowerCase() === email);
      return user ? ([{ ...user }] as T[]) : ([] as T[]);
    }
    if (sql.includes("where id =")) {
      const id = String(values[0] || "");
      const users = await getUsers();
      const user = users.find((u) => u.id === id);
      return user ? ([{ ...user }] as T[]) : ([] as T[]);
    }
    if (sql.includes("order by name")) {
      const users = await getUsers();
      return [...users].sort((a, b) => a.name.localeCompare(b.name)) as T[];
    }
    const users = await getUsers();
    return users.map((u) => ({ ...u })) as T[];
  }

  if (sql.includes("select") && sql.includes("from auth_entries")) {
    if (sql.includes("where user_id =") && sql.includes("and entry_date =")) {
      const userId = String(values[0] || "");
      const entryDate = String(values[1] || "");
      const entry = getEntries().find((e) => e.user_id === userId && e.entry_date === entryDate);
      return entry ? ([{ ...entry }] as T[]) : ([] as T[]);
    }

    if (sql.includes("between") && !sql.includes("user_id =")) {
      const startDate = String(values[0] || "");
      const endDate = String(values[1] || "");
      return getEntries()
        .filter((e) => (!startDate || e.entry_date >= startDate) && (!endDate || e.entry_date <= endDate))
        .map((e) => ({ ...e })) as T[];
    }

    const userId = String(values[0] || "");
    const startDate = values[1] ? String(values[1]) : undefined;
    const endDate = values[2] ? String(values[2]) : undefined;
    let entries = getEntries().filter((e) => e.user_id === userId);
    if (startDate && endDate) {
      entries = entries.filter((e) => e.entry_date >= startDate && e.entry_date <= endDate);
    }
    return entries.map((e) => ({ ...e })) as T[];
  }

  if (sql.includes("insert into auth_users")) {
    const [email, password_hash, name, is_admin] = values;
    const id = Date.now().toString();
    const users = await getUsers();
    users.push({ id, email, password_hash, name, is_admin } as any);
    return [{ id }] as T[];
  }

  if (sql.includes("insert into auth_entries")) {
    const [user_id, entry_date] = values;
    if (!sql.includes("on conflict")) {
      const id = Date.now().toString();
      const created_at = new Date().toISOString();
      getEntries().push({ id, user_id, entry_date, created_at } as any);
      return [{ id }] as T[];
    }
    const existing = getEntries().find((e) => e.user_id === user_id && e.entry_date === entry_date);
    if (existing) return [] as T[];
    const id = Date.now().toString();
    const created_at = new Date().toISOString();
    getEntries().push({ id, user_id, entry_date, created_at } as any);
    return [{ id }] as T[];
  }

  if (sql.includes("delete from auth_users")) {
    const id = String(values[0] || "");
    const users = await getUsers();
    globalThis.globalUsers = users.filter((u) => u.id !== id);
    return [] as T[];
  }

  if (sql.includes("delete from auth_entries")) {
    const user_id = String(values[0] || "");
    const entry_date = String(values[1] || "");
    globalThis.globalEntries = getEntries().filter((e) => !(e.user_id === user_id && e.entry_date === entry_date));
    return [] as T[];
  }

  if (sql.includes("update auth_users") && sql.includes("set is_admin")) {
    const is_admin = values[0];
    const id = String(values[1] || "");
    const users = await getUsers();
    const user = users.find((u) => u.id === id);
    if (user) {
      user.is_admin = !!is_admin;
    }
    return [] as T[];
  }

  return [] as T[];
}

// ---- Redis functions ----

async function redisQuery<T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]> {
  const redis = await getRedisClient();
  const sql = strings.join("?").trim().toLowerCase();

  // Select user by email
  if (sql.includes("select") && sql.includes("from auth_users") && sql.includes("where lower(email)")) {
    const email = String(values[0] || "").toLowerCase();
    const user = await redis.hGetAll(`user:${email}`);
    if (!user.id) return [] as T[];
    return [{
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      name: user.name,
      is_admin: user.is_admin === "true"
    }] as T[];
  }

  // Select user by id
  if (sql.includes("select") && sql.includes("from auth_users") && sql.includes("where id =")) {
    const id = String(values[0] || "");
    const user = await redis.hGetAll(`user_by_id:${id}`);
    if (!user.id) return [] as T[];
    return [{
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      name: user.name,
      is_admin: user.is_admin === "true"
    }] as T[];
  }

  // Select all users ordered by name
  if (sql.includes("select") && sql.includes("from auth_users") && sql.includes("order by name")) {
    const userKeys = await redis.keys("user:*");
    const users = [];
    for (const key of userKeys) {
      const user = await redis.hGetAll(key);
      if (user.id) {
        users.push({
          id: user.id,
          email: user.email,
          password_hash: user.password_hash,
          name: user.name,
          is_admin: user.is_admin === "true"
        });
      }
    }
    users.sort((a, b) => a.name.localeCompare(b.name));
    return users as T[];
  }

  // Select all users
  if (sql.includes("select") && sql.includes("from auth_users")) {
    const userKeys = await redis.keys("user:*");
    const users = [];
    for (const key of userKeys) {
      const user = await redis.hGetAll(key);
      if (user.id) {
        users.push({
          id: user.id,
          email: user.email,
          password_hash: user.password_hash,
          name: user.name,
          is_admin: user.is_admin === "true"
        });
      }
    }
    return users as T[];
  }

  // Select entry by user_id and date
  if (sql.includes("select") && sql.includes("from auth_entries") && sql.includes("where user_id =") && sql.includes("and entry_date =")) {
    const userId = String(values[0] || "");
    const entryDate = String(values[1] || "");
    const entry = await redis.hGetAll(`entry:${userId}:${entryDate}`);
    if (!entry.id) return [] as T[];
    return [{
      id: entry.id,
      user_id: entry.user_id,
      entry_date: entry.entry_date,
      created_at: entry.created_at
    }] as T[];
  }

  // Select entries by date range (all users)
  if (sql.includes("select") && sql.includes("from auth_entries") && sql.includes("between") && !sql.includes("user_id =")) {
    const startDate = String(values[0] || "");
    const endDate = String(values[1] || "");
    const entryKeys = await redis.keys("entry:*");
    const entries = [];
    for (const key of entryKeys) {
      const entry = await redis.hGetAll(key);
      if (entry.id && entry.entry_date >= startDate && entry.entry_date <= endDate) {
        entries.push({
          id: entry.id,
          user_id: entry.user_id,
          entry_date: entry.entry_date,
          created_at: entry.created_at
        });
      }
    }
    return entries as T[];
  }

  // Select entries by user_id (with optional date range)
  if (sql.includes("select") && sql.includes("from auth_entries")) {
    const userId = String(values[0] || "");
    const startDate = values[1] ? String(values[1]) : "";
    const endDate = values[2] ? String(values[2]) : "";
    const pattern = `entry:${userId}:*`;
    const entryKeys = await redis.keys(pattern);
    const entries = [];
    for (const key of entryKeys) {
      const entry = await redis.hGetAll(key);
      if (entry.id) {
        if (!startDate || !endDate || (entry.entry_date >= startDate && entry.entry_date <= endDate)) {
          entries.push({
            id: entry.id,
            user_id: entry.user_id,
            entry_date: entry.entry_date,
            created_at: entry.created_at
          });
        }
      }
    }
    return entries as T[];
  }

  // Insert user
  if (sql.includes("insert into auth_users")) {
    const [email, password_hash, name, is_admin] = values;
    const id = Date.now().toString();
    const user = { id, email, password_hash, name, is_admin: String(is_admin) };
    await redis.hSet(`user:${email}`, user);
    await redis.hSet(`user_by_id:${id}`, user);
    return [{ id }] as T[];
  }

  // Insert entry (with conflict handling)
  if (sql.includes("insert into auth_entries")) {
    const [user_id, entry_date] = values;
    const key = `entry:${user_id}:${entry_date}`;

    if (sql.includes("on conflict")) {
      const existing = await redis.hGetAll(key);
      if (existing.id) return [] as T[];
    }

    const id = Date.now().toString();
    const created_at = new Date().toISOString();
    const entry = { id, user_id, entry_date, created_at };
    await redis.hSet(key, entry);
    return [{ id }] as T[];
  }

  // Delete user
  if (sql.includes("delete from auth_users")) {
    const id = String(values[0] || "");
    const user = await redis.hGetAll(`user_by_id:${id}`);
    if (user.email) {
      await redis.del(`user:${user.email}`);
      await redis.del(`user_by_id:${id}`);
    }
    return [] as T[];
  }

  // Delete entry
  if (sql.includes("delete from auth_entries")) {
    const user_id = String(values[0] || "");
    const entry_date = String(values[1] || "");
    await redis.del(`entry:${user_id}:${entry_date}`);
    return [] as T[];
  }

  // Update user is_admin
  if (sql.includes("update auth_users") && sql.includes("set is_admin")) {
    const is_admin = String(values[0]);
    const id = String(values[1] || "");
    const user = await redis.hGetAll(`user_by_id:${id}`);
    if (user.email) {
      await redis.hSet(`user:${user.email}`, "is_admin", is_admin);
      await redis.hSet(`user_by_id:${id}`, "is_admin", is_admin);
    }
    return [] as T[];
  }

  return [] as T[];
}

// ----------------------------------------------------------------------

export async function query<T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]> {
  if (useRedis) {
    return redisQuery<T>(strings, ...values);
  }
  if (!useMock) {
    const sql = await getNeonClient();
    // @ts-ignore neon template tag signature matches
    return sql<T>(strings, ...values);
  }
  return await mockQuery<T>(strings, ...values);
}
