"""
Tests for SUPABASE_MIGRATION_server_digests.sql on a real (embedded) Postgres.
Run from the repo root:  pip install pgserver && python3 tests/sql/digests-postgres-test.py
pg_cron / pg_net are stubbed (net.http_post records the calls).
"""
import pgserver, re, itertools, json, sys, tempfile, os
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
src=open(os.path.join(ROOT,'SUPABASE_MIGRATION_server_digests.sql'),encoding='utf-8').read()
src=re.sub(r"do \$\$ begin perform cron\.unschedule.*?end \$\$;\n","",src,flags=re.S)
src=re.sub(r"select cron\.schedule\([^\n]*\n","",src)
srv=pgserver.get_server(tempfile.mkdtemp())
for r in ('anon','authenticated'):
    try: srv.psql(f'create role {r};')
    except Exception: pass
passed=failed=0
def check(name,cond,extra=''):
    global passed,failed
    if cond: passed+=1
    else: failed+=1; print('FAIL',name,extra)
def n(sql): return int(srv.psql(sql).strip().split('\n')[2].strip())
def jv(sql):
    out=srv.psql(sql); return json.loads(re.search(r'(\[.*\]|\{.*\})',out,re.S).group(1))
A1='00000000-0000-0000-0000-00000000000a'; A2='00000000-0000-0000-0000-00000000000b'
M1='00000000-0000-0000-0000-000000000001'; M2='00000000-0000-0000-0000-000000000002'; M3='00000000-0000-0000-0000-000000000003'
AX='00000000-0000-0000-0000-00000000000c'  # inactive admin
for duet,rev,rby in itertools.product(['text','date'],['uuid','text'],['jsonb','text[]']):
    L=f'[due={duet} reviewer={rev} read_by={rby}]'
    srv.psql("drop schema public cascade; create schema public; drop schema if exists net cascade;")
    srv.psql(f"""
    create schema net; create table net.calls(id serial, url text, headers jsonb, body jsonb);
    create function net.http_post(url text, body jsonb default '{{}}', params jsonb default '{{}}', headers jsonb default '{{}}', timeout_milliseconds int default 5000) returns bigint language sql as $$ insert into net.calls(url,headers,body) values (url,headers,body) returning id $$;
    create table public.team(id uuid primary key, name text, status text, access text, last_login timestamptz, created_at timestamptz default now(), auto_reminders_active boolean default true);
    create table public.tasks(id uuid primary key default gen_random_uuid(), title text, assigned_to uuid, status text, due {duet}, created_at timestamptz default now(), ts_submitted timestamptz, ts_reviewed timestamptz, ts_opened timestamptz, reviewer {rev});
    create table public.notifications(id uuid primary key default gen_random_uuid(), to_name text, from_name text, message text, type text, task_title text, admins_only boolean default false, read_by {rby} not null default '{'[]' if rby=='jsonb' else '{}'}', created_at timestamptz default now());
    create table public.app_settings(key text primary key, value jsonb not null);
    create table public.auto_reminder_settings(id int primary key, enabled boolean, interval_hours int, tz text default 'Africa/Khartoum', start_hour smallint default 0, end_hour smallint default 24);
    insert into auto_reminder_settings(id,enabled,interval_hours) values (1,true,4);
    """)
    srv.psql(src)
    srv.psql(f"""
    insert into team(id,name,status,access,last_login) values
     ('{A1}','Aymoon','Active','Admin', now()),
     ('{A2}','Sara','Active','Admin', now()),
     ('{AX}','OldAdmin','Inactive','Admin', now()),
     ('{M1}','Ann','Active','Member', now()),
     ('{M2}','Bob','Active','Member', now() - interval '10 days'),
     ('{M3}','Cat','Active','Member', now());
    """)
    today="(now() at time zone 'Africa/Khartoum')::date"
    D=lambda off: f"({today} + ({off}))::text" if duet=='text' else f"({today} + ({off}))"
    R=lambda x: f"'{x}'" if x else "null"
    srv.psql(f"""
    insert into tasks(title,assigned_to,status,due,created_at,ts_submitted,ts_reviewed,reviewer) values
     ('Late5','{M2}','In Progress',{D(-5)}, now()-interval '20 days', null,null,null),
     ('Late2','{M2}','In Progress',{D(-2)}, now()-interval '2 days', null,null,null),
     ('Late1','{M1}','In Progress',{D(-1)}, now()-interval '2 days', null,null,null),
     ('DueToday','{M1}','New',{D(0)}, now()-interval '1 day', null,null,null),
     ('Future','{M3}','New',{D(9)}, now()-interval '1 day', null,null,null),
     ('DoneOld','{M2}','Done',{D(-9)}, now()-interval '30 days', null, now()-interval '20 days', null),
     ('Done1','{M1}','Done',{D(-1)}, now()-interval '3 days', now()-interval '2 days', now()-interval '1 day', null),
     ('Done2','{M1}','Done',{D(-1)}, now()-interval '4 days', now()-interval '3 days', now()-interval '2 days', null),
     ('Done3','{M3}','Done',{D(-1)}, now()-interval '4 days', now()-interval '3 days', now()-interval '3 days', null),
     ('Rev3d','{M1}','Pending Review',{D(3)}, now()-interval '6 days', now()-interval '3 days', null, {R(M3)}),
     ('Rev1h','{M2}','Pending Review',{D(3)}, now()-interval '6 days', now()-interval '1 hour', null, {R(M3)}),
     ('RevNoRev','{M3}','Pending Review',{D(3)}, now()-interval '6 days', now()-interval '2 days', null, null),
     ('Help1','{M2}','Pending Help',{D(4)}, now()-interval '1 day', null,null,null),
     ('Cancelled','{M2}','Cancelled',{D(-8)}, now()-interval '9 days', null,null,null);
    """)
    # ================= MORNING BRIEF =================
    check(L+' brief: off by default -> nothing', jv("select public.run_morning_brief(false,false);")==[])
    srv.psql("insert into app_settings values ('morning_brief','{\"enabled\":true,\"hour\":0}');")
    res=jv("select public.run_morning_brief(true,false);")
    check(L+' brief: goes to the 2 ACTIVE admins only', sorted(r['recipient'] for r in res)==['Aymoon','Sara'], str(res))
    msg=res[0]['message'] if res else ''
    check(L+' brief: overdue counted (Late5,Late2,Late1 = 3) with oldest first', '🚨 3 overdue' in msg and msg.index('Late5')<msg.index('Late2'), msg)
    check(L+' brief: oldest shows days late', '(Bob, 5d)' in msg, msg)
    check(L+' brief: due today = 1', '⏰ 1 due today' in msg, msg)
    check(L+' brief: waiting review = 3 with oldest 3d', '🔍 3 waiting for review (oldest 3d)' in msg, msg)
    check(L+' brief: help = 1', '🆘 1 need help' in msg, msg)
    check(L+' brief: idle member named', '👤 1 not logged in for 3+ days (Bob)' in msg, msg)
    check(L+' brief: done/cancelled never counted as overdue', 'DoneOld' not in msg and 'Cancelled' not in msg)
    check(L+' brief: dry run sends nothing', n("select count(*) from net.calls")==0 and n("select count(*) from notifications")==0)
    srv.psql("select public.run_morning_brief(false,false);")
    check(L+' brief: real run -> 1 notification + 1 push per admin', n("select count(*) from notifications where to_name in ('Aymoon','Sara') and type='Reminder'")==2 and n("select count(*) from net.calls where body->>'title'='☀️ Morning brief'")==2)
    check(L+' brief: push body has no title prefix', n("select count(*) from net.calls where body->>'body' like '🚨 3 overdue%'")==2)
    srv.psql("select public.run_morning_brief(false,false);")
    check(L+' brief: second run same day does not resend', n("select count(*) from digest_log where kind='morning_brief'")==2)
    srv.psql("update digest_log set ref=((now() at time zone 'Africa/Khartoum')::date - 1)::text;")
    srv.psql("select public.run_morning_brief(false,false);")
    check(L+' brief: next day it sends again', n("select count(*) from digest_log where kind='morning_brief'")==4)
    srv.psql("update app_settings set value='{\"enabled\":true,\"hour\":23}' where key='morning_brief'; update auto_reminder_settings set end_hour=24;")
    h=n("select extract(hour from now() at time zone 'Africa/Khartoum')::int")
    if h<23: check(L+' brief: before the configured hour -> nothing', jv("select public.run_morning_brief(true,false);")==[])
    srv.psql("update app_settings set value='{\"enabled\":false,\"hour\":0}' where key='morning_brief';")
    check(L+' brief: switched off -> nothing, but preview (force) still works', jv("select public.run_morning_brief(true,false);")==[] and len(jv("select public.digest_preview('morning_brief');"))==2)
    # all clear
    srv.psql("delete from tasks; delete from digest_log; update team set last_login=now();")
    check(L+' brief: nothing pending -> friendly all-clear', 'nothing overdue or waiting' in jv("select public.digest_preview('morning_brief');")[0]['message'])
    srv.psql(f"""insert into tasks(title,assigned_to,status,due,created_at,ts_submitted,ts_reviewed,reviewer) values
     ('Late5','{M2}','In Progress',{D(-5)}, now()-interval '20 days', null,null,null),
     ('Late2','{M2}','In Progress',{D(-2)}, now()-interval '2 days', null,null,null),
     ('Late1','{M1}','In Progress',{D(-1)}, now()-interval '2 days', null,null,null),
     ('Done1','{M1}','Done',{D(-1)}, now()-interval '3 days', now()-interval '2 days', now()-interval '1 day', null),
     ('Done2','{M1}','Done',{D(-1)}, now()-interval '4 days', now()-interval '3 days', now()-interval '2 days', null),
     ('Done3','{M3}','Done',{D(-1)}, now()-interval '4 days', now()-interval '3 days', now()-interval '3 days', null),
     ('DoneOld','{M2}','Done',{D(-9)}, now()-interval '30 days', null, now()-interval '20 days', null),
     ('Rev3d','{M1}','Pending Review',{D(3)}, now()-interval '6 days', now()-interval '3 days', null, {R(M3)}),
     ('Rev1h','{M2}','Pending Review',{D(3)}, now()-interval '6 days', now()-interval '1 hour', null, {R(M3)}),
     ('RevNoRev','{M3}','Pending Review',{D(3)}, now()-interval '6 days', now()-interval '2 days', null, null);""")
    # ================= ESCALATION =================
    srv.psql("delete from notifications; delete from net.calls; delete from digest_log;")
    check(L+' escalate: off by default -> nothing', jv("select public.run_task_escalations(false,false);")==[])
    srv.psql("insert into app_settings values ('escalation','{\"enabled\":true,\"overdue_days\":2,\"review_hours\":24,\"repeat_days\":3}');")
    res=jv("select public.run_task_escalations(true,false);")
    od=[r for r in res if r['kind']=='overdue']; rv=[r for r in res if r['kind']=='review']
    check(L+' escalate: overdue goes to both active admins', sorted(r['recipient'] for r in od)==['Aymoon','Sara'], str(res))
    om=od[0]['message'] if od else ''
    check(L+' escalate: only tasks overdue 2+ days (Late5, Late2) - not Late1/DueToday', 'Late5' in om and 'Late2' in om and 'Late1' not in om and '2 tasks' in om, om)
    check(L+' escalate: review waiting -> reviewer Cat gets Rev3d only (not the 1-hour one)', any(r['recipient']=='Cat' and 'Rev3d' in r['message'] and 'Rev1h' not in r['message'] for r in rv), str(rv))
    check(L+' escalate: review with NO reviewer goes to admins', any(r['recipient']=='Aymoon' and 'RevNoRev' in r['message'] for r in rv) and any(r['recipient']=='Sara' and 'RevNoRev' in r['message'] for r in rv), str(rv))
    check(L+' escalate: admins do not get reviewer-assigned tasks', not any(r['recipient'] in ('Aymoon','Sara') and 'Rev3d' in r['message'] for r in rv))
    srv.psql("select public.run_task_escalations(false,false);")
    check(L+' escalate: real run notifies (2 admins overdue + Cat + 2 admins review = 5)', n("select count(*) from notifications")==5, str(n("select count(*) from notifications")))
    check(L+' escalate: logged per task', n("select count(*) from digest_log where kind='escalation_overdue'")==2 and n("select count(*) from digest_log where kind='escalation_review'")==2)
    srv.psql("select public.run_task_escalations(false,false);")
    check(L+' escalate: immediate re-run does not repeat', n("select count(*) from notifications")==5)
    srv.psql("update digest_log set sent_at=now()-interval '4 days' where kind='escalation_overdue';")
    srv.psql("select public.run_task_escalations(false,false);")
    check(L+' escalate: overdue repeats after 3 days (not review yet)', n("select count(*) from notifications")==7, str(n("select count(*) from notifications")))
    srv.psql("update digest_log set sent_at=now()-interval '2 days' where kind='escalation_review';")
    srv.psql("select public.run_task_escalations(false,false);")
    check(L+' escalate: review nudged again after the gap', n("select count(*) from notifications")==10, str(n("select count(*) from notifications")))
    srv.psql("update app_settings set value='{\"enabled\":true,\"overdue_days\":4}' where key='escalation';")
    res=jv("select public.digest_preview('escalation');")
    check(L+' escalate: overdue_days=4 -> only Late5', all('Late2' not in r['message'] for r in res if r['kind']=='overdue') and any('Late5' in r['message'] for r in res if r['kind']=='overdue'))
    srv.psql("update app_settings set value='{\"enabled\":false}' where key='escalation'; delete from notifications;")
    srv.psql("select public.run_task_escalations(false,false);")
    check(L+' escalate: switched off -> nothing sent', n("select count(*) from notifications")==0)
    # ================= WEEKLY REPORT =================
    srv.psql("delete from digest_log; delete from net.calls;")
    check(L+' weekly: off by default -> nothing', jv("select public.run_weekly_report(false,false);")==[])
    dow=n("select extract(isodow from now() at time zone 'Africa/Khartoum')::int")
    other=1 if dow!=1 else 2
    srv.psql(f"insert into app_settings values ('weekly_report','{{\"enabled\":true,\"day\":{other},\"hour\":0}}');")
    check(L+' weekly: wrong weekday -> nothing', jv("select public.run_weekly_report(true,false);")==[])
    srv.psql(f"update app_settings set value='{{\"enabled\":true,\"day\":{dow},\"hour\":0}}' where key='weekly_report';")
    res=jv("select public.run_weekly_report(true,false);")
    check(L+' weekly: right weekday -> both admins', sorted(r['recipient'] for r in res)==['Aymoon','Sara'], str(res))
    m=res[0]['message'] if res else ''
    check(L+' weekly: 3 done in the last 7 days (DoneOld excluded)', ' 3 done' in m, m)
    check(L+' weekly: created in last 7 days counted (8)', '8 created' in m, m)
    check(L+' weekly: open = everything not done/cancelled (6)', '6 open' in m, m)
    check(L+' weekly: overdue now = 3', '3 overdue' in m, m)
    check(L+' weekly: top performer Ann (2 done) then Cat', 'Done: Ann 2, Cat 1' in m, m)
    check(L+' weekly: most overdue Bob (2) then Ann (1)', 'Overdue: Bob 2, Ann 1' in m, m)
    srv.psql("select public.run_weekly_report(false,false);")
    check(L+' weekly: real run notifies both admins', n("select count(*) from notifications where message like '📊 Weekly report%'")==2)
    srv.psql("select public.run_weekly_report(false,false);")
    check(L+' weekly: only once per week', n("select count(*) from digest_log where kind='weekly_report'")==2)
    # ================= WHO GETS WHAT (recipient_access) =================
    srv.psql("delete from digest_log; delete from notifications; delete from net.calls; delete from app_settings where key in ('recipient_access','escalation','weekly_report','morning_brief');")
    srv.psql("insert into app_settings values ('escalation','{\"enabled\":true,\"overdue_days\":2,\"review_hours\":24}');")
    names=lambda q: sorted(r['recipient'] for r in jv(q))
    # not configured -> legacy: every active Admin
    check(L+' recipients: not configured -> active Admins (legacy)', names("select public.digest_preview('morning_brief');")==['Aymoon','Sara'])
    # configured: only the ticked, active people - and NOT limited to Admins
    ra=json.dumps({"people":{A1:{"brief":True,"weekly":True},M1:{"weekly":True,"escalation":True},AX:{"brief":True,"weekly":True,"escalation":True}}})
    srv.psql("insert into app_settings values ('recipient_access', '"+ra+"');")
    check(L+' recipients: brief goes only to the ticked active admin (Sara not ticked, OldAdmin inactive)', names("select public.digest_preview('morning_brief');")==['Aymoon'], str(names("select public.digest_preview('morning_brief');")))
    check(L+' recipients: weekly goes to a ticked admin AND a ticked non-admin member', names("select public.digest_preview('weekly_report');")==['Ann','Aymoon'], str(names("select public.digest_preview('weekly_report');")))
    esc=jv("select public.digest_preview('escalation');")
    check(L+' recipients: overdue escalation only to the ticked person (Ann), not to admins', sorted(r['recipient'] for r in esc if r['kind']=='overdue')==['Ann'], str(esc))
    check(L+' recipients: reviewer still nudged by default (Cat gets Rev3d)', any(r['recipient']=='Cat' and 'Rev3d' in r['message'] for r in esc if r['kind']=='review'))
    check(L+' recipients: review with no reviewer goes to the escalation recipients (Ann), not all admins', any(r['recipient']=='Ann' and 'RevNoRev' in r['message'] for r in esc if r['kind']=='review') and not any(r['recipient'] in ('Aymoon','Sara') for r in esc))
    srv.psql("update app_settings set value='{\"enabled\":true,\"overdue_days\":2,\"review_hours\":24,\"notify_reviewers\":false}' where key='escalation';")
    esc=jv("select public.digest_preview('escalation');")
    check(L+' recipients: reviewer nudge OFF -> Rev3d goes to the escalation recipient (Ann) instead of Cat', any(r['recipient']=='Ann' and 'Rev3d' in r['message'] for r in esc if r['kind']=='review') and not any(r['recipient']=='Cat' for r in esc))
    # real run only touches the chosen people
    srv.psql("select public.run_task_escalations(false,false);")
    check(L+' recipients: real escalation run notifies only Ann', n("select count(*) from notifications where to_name<>'Ann'")==0 and n("select count(*) from notifications where to_name='Ann'")>=1)
    check(L+' recipients: no push went to anyone else', n("select count(*) from net.calls where body->>'member_id' <> '"+M1+"'")==0)
    # configured but empty -> nobody (explicit "nobody", never falls back to admins)
    srv.psql("update app_settings set value='{\"people\":{}}' where key='recipient_access';")
    check(L+' recipients: configured-but-empty means NOBODY gets anything', names("select public.digest_preview('morning_brief');")==[] and names("select public.digest_preview('weekly_report');")==[] and jv("select public.digest_preview('escalation');")==[])
    srv.psql("delete from app_settings where key='recipient_access';")
    check(L+' recipients: removing the setting restores the default', names("select public.digest_preview('morning_brief');")==['Aymoon','Sara'])
    ok=n("select count(*) from pg_proc p join pg_namespace s on s.oid=p.pronamespace where s.nspname='public' and p.proname='_dg_recipients' and has_function_privilege('anon',p.oid,'execute')")==0
    check(L+' security: anon cannot call the recipients helper', ok)
    # security: nobody can call the senders through the API; preview is allowed
    ok=n("select count(*) from pg_proc p join pg_namespace s on s.oid=p.pronamespace where s.nspname='public' and p.proname='run_morning_brief' and has_function_privilege('anon',p.oid,'execute')")==0
    check(L+' security: anon cannot run the senders', ok)
    check(L+' security: anon can call the preview', n("select has_function_privilege('anon','public.digest_preview(text)','execute')::int")==1)
print(f"\n{passed} passed, {failed} failed"); sys.exit(1 if failed else 0)
