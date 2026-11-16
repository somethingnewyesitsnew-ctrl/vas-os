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

> **Never commit the private key to this repository (it is public).** It is
> only ever stored as a Supabase secret.

Generate a key pair once (any computer with Node):

```
npx web-push generate-vapid-keys
```

- The **public** key goes in the client: `VAPID_PUBLIC_KEY` in
  `js/01-push-notifications.js` (it is safe for this to be public).
- The **private** key goes ONLY into the Supabase secret `VAPID_PRIVATE_KEY`
  (step 3 below). Do not paste it into code, chat, tickets or this file.
- `VAPID_SUBJECT` = a contact like `mailto:youremail@example.com` (required by
  the push spec, never shown to users).

Secrets to set on the function: `VAPID_PUBLIC_KEY` (same value as the client),
`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

If you ever rotate the keys: update the client constant, update the secrets,
and run `SUPABASE_MIGRATION_push_key_rotation.sql` to clear old subscriptions.
Devices re-subscribe automatically the next time the app is opened.

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
supabase secrets set VAPID_PUBLIC_KEY=<your public key>
supabase secrets set VAPID_PRIVATE_KEY=<your private key>
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
