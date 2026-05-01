import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";
import { verifySession } from '@/app/lib/session';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_KEY ?? "placeholder",
  { auth: { persistSession: false } }
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: profile, error: fetchError } = await supabaseAdmin
    .from('subscribers')
    .select('role, companyName, tweaks_used, tweaks_limit')
    .eq('id', id)
    .single();

  if (fetchError || !profile) {
    return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
  }

  if (profile.tweaks_used >= profile.tweaks_limit) {
    return NextResponse.json({ error: 'Tweak limit reached' }, { status: 403 });
  }

  const body = await request.json();

  // Only write columns that exist in the subscribers schema. Form fields
  // segments / regions / focus / watchlist have no backing column today, so
  // they are accepted from the client but not persisted — flagging these
  // would require a schema migration.
  const updates: Record<string, unknown> = {
    role:        body.role    ?? profile.role,
    companyName: body.company ?? profile.companyName,
    tweaks_used: profile.tweaks_used + 1,
  };

  // Atomic guard via optimistic concurrency: only update if tweaks_used is
  // still what we read. Concurrent writers each see the prior value — only
  // one can win per version, so tweaks_used is incremented at most once
  // per successful write and never beyond the limit.
  const { data: updatedRows, error: updateError } = await supabaseAdmin
    .from('subscribers')
    .update(updates)
    .eq('id', id)
    .eq('tweaks_used', profile.tweaks_used)
    .select('tweaks_used, tweaks_limit');

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json(
      { error: 'Update raced with another tweak — please retry' },
      { status: 409 }
    );
  }

  const updated = updatedRows[0] as { tweaks_used: number; tweaks_limit: number };
  return NextResponse.json({
    success:      true,
    tweaks_used:  updated.tweaks_used,
    tweaks_limit: updated.tweaks_limit,
  });
}
