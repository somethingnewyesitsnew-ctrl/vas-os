-- Run ONCE right after the VAPID keys are rotated (new secrets set on the send-push
-- function AND the new app version is live).
--
-- Every existing push subscription was created with the OLD key and can never
-- receive a push signed with the NEW key. Clearing them lets each device
-- register a fresh one: that happens automatically, with no click, the next time
-- the member opens the app (permission is already granted on their device).
delete from public.push_subscriptions;
