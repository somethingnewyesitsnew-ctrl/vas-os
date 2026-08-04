// ══════════════════════════════════════════════════════════════════════
// send-push — Supabase Edge Function
//
// The one server-side piece Web Push requires: signing outgoing pushes
// with the VAPID *private* key, which must never be shipped to the
// browser. Everything else in VAS OS is static/client-side; this is the
// single exception.
//
// Called from the client as:
//   POST https://<project-ref>.functions.supabase.co/send-push
//   { "member_id": "...", "title": "...", "body": "...", "url": "..." }
//
// Looks up every push_subscriptions row for that member (they may have
// several devices), sends to each, and prunes subscriptions the push
// service reports as gone (404/410 — user revoked permission, uninstalled,
// etc.) so the table doesn't accumulate dead rows.
// ══════════════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { member_id, title, body, url } = await req.json();
    if (!member_id || !title) {
      return new Response(JSON.stringify({ error: 'member_id and title are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('member_id', member_id);

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions for this member' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({ title, body: body || '', url: url || '/' });
    let sent = 0;
    const dead: string[] = [];

    await Promise.all(
      subs.map(async (s: any) => {
        const subscription = {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        };
        try {
          await webpush.sendNotification(subscription, payload);
          sent++;
        } catch (err: any) {
          // 404/410 = subscription no longer valid (revoked, uninstalled, expired)
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            dead.push(s.endpoint);
          }
          // Other errors (network blip, etc.) are left alone — not fatal to the batch
        }
      })
    );

    if (dead.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', dead);
    }

    return new Response(JSON.stringify({ sent, pruned: dead.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('send-push error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
