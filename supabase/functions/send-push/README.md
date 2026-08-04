# Deploying `send-push`

This is the one server-side piece push notifications need — it holds the
VAPID private key (which must never go in client code) and actually sends
the push to each subscribed device.

Do this **once**. After it's deployed, every task/reminder/meeting/etc.
notification already wired into `notifyTG()` gets push for free — nothing
else to touch per event.

## 1. Run the SQL migration first

Supabase Dashboard → **SQL Editor** → paste and run
`SUPABASE_MIGRATION_push_subscriptions.sql` (repo root). Creates the table
this function reads from.

## 2. Your VAPID keys

Already generated and wired into the client (`js/01-push-notifications.js`,
`VAPID_PUBLIC_KEY` constant). You only need to set the **private** one as
a secret — never put it in client code.

```
VAPID_PUBLIC_KEY  = BPE_NOrkd8udHrEJPpzznZXZNdBqR9YJ_EaHlKKPLjDqBAyw9O8JUNw92Dky-Hob0BUiyynpCdWOtgIW46z3Rnw
VAPID_PRIVATE_KEY = oH0uFU9wqRe9Vrz5PU6QffTRFti4r38B6-YDZoiNums
VAPID_SUBJECT     = mailto:youremail@example.com   (any contact email/URL — required by the push spec, not shown to users)
```

## 3. Deploy — pick one

### Option A — Dashboard (no install required)
1. Supabase Dashboard → **Edge Functions** → **Deploy a new function**
2. Name it exactly `send-push`
3. Paste the contents of `index.ts` (this folder) into the editor
4. Click **Deploy**
5. Go to **Edge Functions → send-push → Settings → Secrets** (or the
   project-wide **Settings → Edge Functions → Secrets**) and add:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT`
   (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically
   — don't set those yourself.)

### Option B — CLI
```bash
npm install -g supabase
supabase login
supabase link --project-ref duglbebwhtuijnduwmvz
supabase secrets set VAPID_PUBLIC_KEY=BPE_NOrkd8udHrEJPpzznZXZNdBqR9YJ_EaHlKKPLjDqBAyw9O8JUNw92Dky-Hob0BUiyynpCdWOtgIW46z3Rnw
supabase secrets set VAPID_PRIVATE_KEY=oH0uFU9wqRe9Vrz5PU6QffTRFti4r38B6-YDZoiNums
supabase secrets set VAPID_SUBJECT=mailto:youremail@example.com
supabase functions deploy send-push
```

## 4. Verify

The function will be live at:
```
https://duglbebwhtuijnduwmvz.supabase.co/functions/v1/send-push
```
which is already hardcoded as `PUSH_EDGE_FN_URL` in `js/01-push-notifications.js`
— no client change needed.

To test: log into VAS OS → **Settings → Push Notifications → Enable Push on
This Device** → grant the browser permission prompt → click **🧪 Test**. A
notification should appear within a couple seconds, even if you switch to
another tab or app.

## Notes
- The function requires a valid Supabase `apikey`/`Authorization` header
  by default (standard JWT verification) — the client already sends the
  anon key on every call, so this just works without extra flags.
- Subscriptions the push service reports as gone (expired, permission
  revoked, uninstalled) are pruned from `push_subscriptions` automatically
  on the next send to that member.
- iOS only supports Web Push for sites **added to the Home Screen**
  (Safari 16.4+ / iOS 16.4+). Android and desktop Chrome/Edge/Firefox work
  in a normal browser tab, no install needed.
