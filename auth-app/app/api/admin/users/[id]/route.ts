import { NextResponse } from "next/server";
import { verifyToken } from "../../../../../lib/crypto";
import { query } from "../../../../../lib/db";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Verify admin authentication
  const cookie = req.headers.get('cookie') || '';
  const m = /(?:^|; )auth-token=([^;]+)/.exec(cookie);
  if (!m) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const secret = process.env.AUTH_SESSION_SECRET || 'dev-secret';
  const v = verifyToken(decodeURIComponent(m[1]), secret);
  if (!v.valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Check if user is admin
  if (!v.payload?.is_admin) {
    return NextResponse.json({ error: 'admin_required' }, { status: 403 });
  }

  const { id } = await params;

  // Prevent admin from deleting themselves
  if (v.payload?.sub === id) {
    return NextResponse.json({ error: 'cannot_delete_self' }, { status: 400 });
  }

  // Delete user (this is a simple implementation for the in-memory database)
  // In a real database, you would also need to handle foreign key constraints
  try {
    const result = await query`delete from auth_users where id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}