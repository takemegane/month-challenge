import { NextResponse } from "next/server";
import { query } from "../../../../../../lib/db";
import { requireAdmin } from "../../../../../../lib/admin-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { is_admin } = body;

    if (typeof is_admin !== 'boolean') {
      return NextResponse.json({ error: 'invalid_privilege_value' }, { status: 400 });
    }

    // Prevent admin from removing their own admin privileges
    if (admin.user.id === id && is_admin === false) {
      return NextResponse.json({ error: 'cannot_remove_own_privileges' }, { status: 400 });
    }

    // Update user privileges
    const result = await query`
      update auth_users set is_admin = ${is_admin} where id = ${id}
    `;

    // Get updated user info
    const users = await query<{ id: string; email: string; name: string; is_admin: boolean }>`
      select id, email, name, is_admin from auth_users where id = ${id}
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: users[0],
      message: is_admin ? 'Admin privileges granted' : 'Admin privileges revoked'
    });
  } catch (error) {
    console.error('Error updating user privileges:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
