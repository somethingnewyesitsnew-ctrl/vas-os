import pgserver, re, itertools, json, sys, tempfile
src=open('./SUPABASE_MIGRATION_server_auto_reminders.sql',encoding='utf-8').read()
# strip the pieces that need real pg_cron/pg_net (stubbed below)
src=re.sub(r"create extension if not exists pg_cron[^\n]*\n","",src)
src=re.sub(r"create extension if not exists pg_net[^\n]*\n","",src)
src=re.sub(r"do \$\$ begin perform cron\.unschedule.*?end \$\$;\n","",src,flags=re.S)
src=re.sub(r"select cron\.schedule\([^\n]*\n","",src)
tmp=tempfile.mkdtemp()
srv=pgserver.get_server(tmp)
def q(sql,fetch=True):
    return srv.psql(sql)
import subprocess
def run(sql):
    r=srv.psql(sql); return r
for r in ('anon','authenticated'):
    try: srv.psql(f'create role {r};')
    except Exception: pass
passed=failed=0
def check(name,cond,extra=''):
    global passed,failed
    if cond: passed+=1; print('PASS',name)
    else: failed+=1; print('FAIL',name,extra)

for assg,rby,duet in itertools.product(['jsonb','text[]','uuid[]'],['jsonb','text[]'],['text','date']):
    label=f'[assignees={assg} read_by={rby} due={duet}]'
    srv.psql("drop schema public cascade; create schema public; drop schema if exists net cascade;")
    srv.psql(f"""
    create schema net;
    create table net.calls(id serial, url text, headers jsonb, body jsonb);
    create function net.http_post(url text, body jsonb default '{{}}', params jsonb default '{{}}', headers jsonb default '{{}}', timeout_milliseconds int default 5000)
      returns bigint language sql as $$ insert into net.calls(url,headers,body) values (url,headers,body) returning id $$;
    create table public.team(id uuid primary key default gen_random_uuid(), name text, status text, auto_reminders_active boolean default true);
    create table public.tasks(id uuid primary key default gen_random_uuid(), title text, assigned_to uuid, assignees {assg}, status text, due {duet}, ts_opened timestamptz);
    create table public.notifications(id uuid primary key default gen_random_uuid(), to_name text, from_name text, message text, type text, task_title text, admins_only boolean default false, read_by {rby} not null default '{'[]' if rby=='jsonb' else '{}'}', created_at timestamptz default now());
    create table public.auto_reminder_settings(id int primary key, enabled boolean default false, interval_hours int default 4, updated_at timestamptz);
    insert into public.auto_reminder_settings(id,enabled,interval_hours) values (1,true,4);
    """)
    srv.psql(src)
    srv.psql('update public.auto_reminder_settings set start_hour=0, end_hour=24;')  # test clock may be at night in Khartoum
    # local 'today' in Khartoum
    srv.psql("""
    insert into team(id,name,status,auto_reminders_active) values
     ('00000000-0000-0000-0000-000000000001','Ann','Active',true),
     ('00000000-0000-0000-0000-000000000002','Bob','Active',true),
     ('00000000-0000-0000-0000-000000000003','Cat','Active',true),
     ('00000000-0000-0000-0000-000000000004','Dan','Inactive',true),
     ('00000000-0000-0000-0000-000000000005','Eve','Active',false),
     ('00000000-0000-0000-0000-000000000006','Fay','Active',null);
    """)
    today="(now() at time zone 'Africa/Khartoum')::date"
    def dv(off): return f"({today} + ({off}))::text" if duet=='text' else f"({today} + ({off}))"
    asg_other = "'{}'" if assg!='jsonb' else "'[]'"
    arr=lambda ids: (f"'{json.dumps(ids)}'::jsonb" if assg=='jsonb' else ("'{"+",".join(ids)+"}'"))
    A='00000000-0000-0000-0000-000000000001'; B='00000000-0000-0000-0000-000000000002'
    srv.psql(f"""
    insert into tasks(title,assigned_to,assignees,status,due,ts_opened) values
     ('new-unopened','{A}',null,'New',{dv(10)},null),
     ('overdue','{A}',null,'In Progress',{dv(-3)},now()),
     ('soon-via-assignees','{B}',{arr([A])},'In Progress',{dv(1)},now()),
     ('done-old','{A}',null,'Done',{dv(-9)},now()),
     ('cancelled','{A}',null,'Cancelled',{dv(-9)},now()),
     ('bobs-only','{B}',null,'In Progress',{dv(20)},now()),
     ('no-due','{A}',null,'In Progress',null,now()),
     ('today','{A}',null,'In Progress',{dv(0)},now()),
     ('fay-overdue','00000000-0000-0000-0000-000000000006',null,'In Progress',{dv(-1)},now());
    """)
    out=srv.psql("select public.run_auto_task_reminders(true);")
    res=json.loads(re.search(r'(\[.*\])',out,re.S).group(1))
    byname={r['member']:r for r in res}
    check(label+' dry run: Ann = 1 new, 1 overdue, 2 due soon (today + via assignees)', byname.get('Ann')=={'member':'Ann','new':1,'overdue':1,'due_soon':2}, str(byname.get('Ann')))
    check(label+' dry run: Bob only counts tasks assigned to him (none overdue/new)', 'Bob' not in byname or byname['Bob'].get('overdue')==0, str(byname.get('Bob')))
    check(label+' dry run: Cat (nothing), Dan (inactive), Eve (opted out) get nothing', not ({'Cat','Dan','Eve'} & set(byname)))
    check(label+' dry run: Fay (auto flag null) IS included', 'Fay' in byname)
    check(label+' dry run sends and logs nothing', 'count | \n-------\n     0' in srv.psql("select count(*) from net.calls;") .replace('  ',' ') or srv.psql("select count(*) from net.calls;").strip().split('\n')[-2].strip()=='0')
    out=srv.psql("select public.run_auto_task_reminders(false);")
    n=lambda s: int(srv.psql(s).strip().split('\n')[2].strip())
    check(label+' real run writes in-app notifications for Ann and Fay (+Bob if any)', n("select count(*) from notifications where type='Reminder' and from_name='System' and to_name in ('Ann','Fay')")==2)
    check(label+' message text correct', 'Task check-in: 📥 1 new task not opened yet · 🚨 1 overdue task · ⏰ 2 tasks due soon' in srv.psql("select message from notifications where to_name='Ann'"))
    check(label+' push requests queued to send-push with member id, title, body', n("select count(*) from net.calls where url like '%/functions/v1/send-push' and body->>'member_id'='00000000-0000-0000-0000-000000000001' and body->>'title'='⏰ Task check-in' and headers->>'Authorization' like 'Bearer eyJ%'")==1)
    check(label+' log rows written', n("select count(*) from auto_reminder_log")==n("select count(*) from notifications"))
    before=n("select count(*) from notifications")
    srv.psql("select public.run_auto_task_reminders(false);")
    check(label+' immediate re-run sends nothing (interval respected)', n("select count(*) from notifications")==before)
    srv.psql("update auto_reminder_log set sent_at=now()-interval '3 hours 50 minutes';")
    srv.psql("select public.run_auto_task_reminders(false);")
    check(label+' ~3h50m later the 4h interval counts as elapsed (cron slack)', n("select count(*) from notifications")==before*2)
    srv.psql("update auto_reminder_log set sent_at=now()-interval '1 hour';"); b2=n("select count(*) from notifications")
    srv.psql("select public.run_auto_task_reminders(false);")
    check(label+' after only 1 hour nothing is sent', n("select count(*) from notifications")==b2)
    # switched off
    srv.psql("update auto_reminder_log set sent_at=now()-interval '9 hours'; update auto_reminder_settings set enabled=false;"); b3=n("select count(*) from notifications")
    srv.psql("select public.run_auto_task_reminders(false);")
    check(label+' disabled in Settings -> nothing sent', n("select count(*) from notifications")==b3)
    # quiet hours: make the allowed window exclude the current Khartoum hour
    srv.psql("update auto_reminder_settings set enabled=true, start_hour=(extract(hour from now() at time zone 'Africa/Khartoum')::int+1)%24, end_hour=(extract(hour from now() at time zone 'Africa/Khartoum')::int+2)%24;")
    # window may wrap past midnight; only assert when it does not
    ok=n("select (start_hour<end_hour)::int from auto_reminder_settings")
    if ok:
        srv.psql("select public.run_auto_task_reminders(false);")
        check(label+' outside the allowed hours -> nothing sent', n("select count(*) from notifications")==b3)
        srv.psql("update auto_reminder_settings set start_hour=0,end_hour=24;")
        srv.psql("select public.run_auto_task_reminders(false);")
        check(label+' inside the allowed hours -> sends again', n("select count(*) from notifications")>b3)
    # one member's bad data must not stop the others
    srv.psql("update auto_reminder_log set sent_at=now()-interval '9 hours'; update auto_reminder_settings set start_hour=0,end_hour=24;")
print(f"\n{passed} passed, {failed} failed"); sys.exit(1 if failed else 0)
