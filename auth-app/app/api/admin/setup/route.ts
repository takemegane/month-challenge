import { NextResponse } from "next/server";
import { hashPassword } from "../../../../lib/crypto";
import { query } from "../../../../lib/db";

export async function POST() {
  try {
    // 管理者アカウントを強制作成
    const email = "admin@example.com";
    const password = "password123";
    const name = "管理者";

    // 既存ユーザーを削除
    await query`delete from auth_users where lower(email) = lower(${email})`;

    // 新しい管理者アカウントを作成
    const passwordHash = hashPassword(password);
    await query`
      insert into auth_users (email, password_hash, name, is_admin)
      values (${email}, ${passwordHash}, ${name}, true)
    `;

    return NextResponse.json({
      message: "Admin account created successfully",
      email,
      password,
      note: "Use these credentials to login"
    });
  } catch (error: any) {
    return NextResponse.json({
      error: "Failed to create admin account",
      details: error.message
    }, { status: 500 });
  }
}