import { hashPassword } from "./crypto";

const DATABASE_URL = process.env.DATABASE_URL_AUTH || process.env.DATABASE_URL;
const useMock = !DATABASE_URL;
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

function ensureDefaultAdmin() {
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

function getUsers() {
  ensureDefaultAdmin();
  return globalThis.globalUsers!;
}

function getEntries() {
  return globalThis.globalEntries!;
}

function mockQuery<T = any>(strings: TemplateStringsArray, ...values: any[]): T[] {
  const sql = strings.join("?").trim().toLowerCase();

  if (sql.includes("select") && sql.includes("from auth_users")) {
    if (sql.includes("where lower(email)")) {
      const email = String(values[0] || "").toLowerCase();
      const user = getUsers().find((u) => u.email.toLowerCase() === email);
      return user ? ([{ ...user }] as T[]) : ([] as T[]);
    }
    if (sql.includes("where id =")) {
      const id = String(values[0] || "");
      const user = getUsers().find((u) => u.id === id);
      return user ? ([{ ...user }] as T[]) : ([] as T[]);
    }
    if (sql.includes("order by name")) {
      return [...getUsers()].sort((a, b) => a.name.localeCompare(b.name)) as T[];
    }
    return getUsers().map((u) => ({ ...u })) as T[];
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
    getUsers().push({ id, email, password_hash, name, is_admin } as any);
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
    globalThis.globalUsers = getUsers().filter((u) => u.id !== id);
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
    const user = getUsers().find((u) => u.id === id);
    if (user) {
      user.is_admin = !!is_admin;
    }
    return [] as T[];
  }

  return [] as T[];
}

// ----------------------------------------------------------------------

export async function query<T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]> {
  if (!useMock) {
    const sql = await getNeonClient();
    // @ts-ignore neon template tag signature matches
    return sql<T>(strings, ...values);
  }
  return mockQuery<T>(strings, ...values);
}
