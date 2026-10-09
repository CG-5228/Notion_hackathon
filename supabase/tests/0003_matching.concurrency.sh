#!/usr/bin/env bash
# Concurrency test for 0003 (needs a disposable DB with 0001+0002+0003 applied).
# Fires many simultaneous request_buddy calls from separate connections and checks
# that no group exceeds its cap, nobody is placed twice, and pairs are exactly 2.
#   DB_URL=postgres://... bash supabase/tests/0003_matching.concurrency.sh
set -euo pipefail
: "${DB_URL:?DB_URL required}"
N=${N:-23}
EV=20000000-0000-0000-0000-0000000000ff
EV2=20000000-0000-0000-0000-0000000000fe
q() { psql "$DB_URL" -v ON_ERROR_STOP=1 -qAt -c "$1"; }

q "delete from auth.users where email like 'conc%@demo.findyourbuddy.test';
   delete from public.events where id in ('$EV','$EV2');
   insert into public.events(id) values ('$EV'),('$EV2');"
for i in $(seq 1 $N); do
  q "insert into auth.users(id,email,email_confirmed_at) values (gen_random_uuid(),'conc$i@demo.findyourbuddy.test',now());"
done
q "update public.profiles p set age_confirmed = true from auth.users u where u.id=p.user_id and u.email like 'conc%';
   insert into public.event_rsvps(event_id,user_id,status) select e, u.id, 'going' from auth.users u, (values ('$EV'::uuid),('$EV2'::uuid)) v(e) where u.email like 'conc%';"

call() { # uid event mode size
  psql "$DB_URL" -qAt >/dev/null 2>&1 <<SQL || true
begin; set local role authenticated;
select set_config('request.jwt.claim.sub','$1',true);
select set_config('request.jwt.claims','{"sub":"$1","role":"authenticated"}',true);
select public.request_buddy('$2','$3',$4);
select public.request_buddy('$2','$3',$4);
commit;
SQL
}
i=0
for uid in $(q "select id from auth.users where email like 'conc%' order by email"); do
  i=$((i+1)); size=$(( (i % 3) + 3 ))
  call "$uid" "$EV" group "$size" &
  call "$uid" "$EV2" pair null &
done
wait

over=$(q "select count(*) from public.buddy_matches m where event_id in ('$EV','$EV2') and (select count(*) from public.buddy_match_members x where x.match_id=m.id and x.left_at is null) > m.max_size")
dup=$(q "select count(*) from (select user_id,event_id from public.buddy_match_members where left_at is null and event_id in ('$EV','$EV2') group by 1,2 having count(*)>1) s")
badpair=$(q "select count(*) from public.buddy_matches m where event_id='$EV2' and (select count(*) from public.buddy_match_members x where x.match_id=m.id) <> 2")
waitdup=$(q "select count(*) from (select user_id from public.buddy_requests where event_id='$EV2' and status='waiting' group by 1 having count(*)>1) s")
placed=$(q "select count(distinct user_id) from public.buddy_match_members where event_id='$EV' and left_at is null")
pairs=$(q "select count(*) from public.buddy_matches where event_id='$EV2'")
echo "group placed=$placed/$N  pairs=$pairs  over_cap=$over  double_placed=$dup  bad_pairs=$badpair  dup_waiting=$waitdup"
[ "$over" = 0 ] && [ "$dup" = 0 ] && [ "$badpair" = 0 ] && [ "$waitdup" = 0 ] && [ "$placed" = "$N" ] && [ "$pairs" = $((N/2)) ] \
  && echo "CONCURRENCY TESTS PASSED" || { echo "CONCURRENCY TESTS FAILED"; exit 1; }
