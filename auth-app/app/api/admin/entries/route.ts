import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { requireAdmin } from "../../../../lib/admin-auth";

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }

  const body = await req.json();
  const { user_id, entry_date } = body;

  if (!user_id || !entry_date) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  try {
    // First check if entry already exists
    const existingEntries = await query<{ id: string }>`
      select id from auth_entries where user_id = ${user_id} and entry_date = ${entry_date}
    `;

    if (existingEntries.length > 0) {
      return NextResponse.json({ status: 'exists' });
    }

    // Create new entry
    const rows = await query<{ id: string }>`
      insert into auth_entries (user_id, entry_date) values (${user_id}, ${entry_date})
      returning id
    `;
    return NextResponse.json({ status: 'created' });
  } catch (error) {
    console.error('Error creating entry:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }

  const body = await req.json();
  const { user_id, entry_date } = body;

  if (!user_id || !entry_date) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  try {
    // First check if entry exists
    const existingEntries = await query<{ id: string }>`
      select id from auth_entries where user_id = ${user_id} and entry_date = ${entry_date}
    `;

    if (existingEntries.length === 0) {
      return NextResponse.json({ status: 'not_found', message: 'チェックが見つかりません' });
    }

    // Delete the entry
    await query`delete from auth_entries where user_id = ${user_id} and entry_date = ${entry_date}`;
    return NextResponse.json({ status: 'deleted' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
