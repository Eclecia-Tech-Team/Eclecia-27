#!/usr/bin/env python3
"""Seed registrations using real users from the DB.

Solo event (isTeamEvent false):
  python register.py veritasium --users <userId> <userId>     # specific users
  python register.py veritasium --random 5                    # 5 random eligible users

Team event (isTeamEvent true):
  python register.py hackathon --users <leaderId> <m2> <m3>   # ONE team, first id = leader
  python register.py hackathon --teams 2 --team-size 3        # 2 random teams of 3

Eligible = user.verified && not already registered for the event.
Registrations start verified=false (use --verified to override). Teams start paymentStatus="pending".
"""
import argparse
import random

from common import (die, events, find_event, get_db, now, oid, registrations,
                    teams, unique_code, users)

# Assumption: team.team[] includes the leader. Flip if yours is "members excluding leader".
LEADER_IN_TEAM_ARRAY = True


def reg_doc(ev, user_id, verified, **extra):
    t = now()
    doc = {
        "eventId": ev["_id"], "isInTeam": False, "participant": user_id,
        "verified": verified, "checkedIn": False, "foodServedCount": 0,
        "createdAt": t, "updatedAt": t, "__v": 0,
    }
    doc.update(extra)
    return doc


def eligible_pool(db, ev):
    taken = {r["participant"] for r in registrations(db).find({"eventId": ev["_id"]}, {"participant": 1})}
    return [u for u in users(db).find({"verified": True})
            if u["_id"] not in taken]


def load_explicit(db, ev, ids):
    pool = {u["_id"]: u for u in eligible_pool(db, ev)}
    out = []
    for raw in ids:
        u = pool.get(oid(raw))
        if not u:
            die(f"user {raw} not found, not verified, or already registered for this event")
        out.append(u)
    if len({u["_id"] for u in out}) != len(out):
        die("duplicate user ids in --users")
    return out


def push_to_event(db, ev, reg_ids, enabled):
    if enabled and reg_ids:
        events(db).update_one({"_id": ev["_id"]}, {"$push": {"registrations": {"$each": reg_ids}}})


def register_solo(db, ev, user_list, verified, push):
    ids = []
    for u in user_list:
        code = unique_code(registrations(db), "registrationCode", "REG", 8)
        r = registrations(db).insert_one(reg_doc(ev, u["_id"], verified, registrationCode=code))
        ids.append(r.inserted_id)
        print(f"  solo  {code}  {u.get('fullName') or u['username']}")
    push_to_event(db, ev, ids, push)


def register_team(db, ev, members, verified, push, name=None):
    leader = members[0]
    t = now()
    team_code = unique_code(teams(db), "teamCode", "TEAM", 6)
    team_ids = [m["_id"] for m in members] if LEADER_IN_TEAM_ARRAY else [m["_id"] for m in members[1:]]
    team = teams(db).insert_one({
        "eventId": ev["_id"], "teamCode": team_code,
        "teamName": name or f"Team {leader.get('fullName') or leader['username']}",
        "teamLeader": leader["_id"], "team": team_ids,
        "paymentStatus": "pending", "createdAt": t, "updatedAt": t, "__v": 0,
    })
    ids = []
    for i, m in enumerate(members):
        extra = {"isInTeam": True, "teamId": team.inserted_id}
        if i == 0:  # only the leader carries the public code (sparse unique index: omit, never null)
            extra["registrationCode"] = unique_code(registrations(db), "registrationCode", "REG", 8)
        r = registrations(db).insert_one(reg_doc(ev, m["_id"], verified, **extra))
        ids.append(r.inserted_id)
    push_to_event(db, ev, ids, push)
    print(f"  team  {team_code}  leader={leader.get('fullName') or leader['username']}  "
          f"size={len(members)}  leaderRegCode={extra_code(db, ids[0])}")


def extra_code(db, reg_id):
    return registrations(db).find_one({"_id": reg_id}).get("registrationCode")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("event", help="event slug or _id")
    p.add_argument("--users", nargs="+", help="user _ids (team: first is leader)")
    p.add_argument("--random", type=int, help="solo: number of random users")
    p.add_argument("--teams", type=int, default=1, help="team: number of random teams")
    p.add_argument("--team-size", type=int, help="team: size for random teams")
    p.add_argument("--team-name")
    p.add_argument("--verified", action="store_true", help="mark registrations verified immediately")
    p.add_argument("--no-event-push", action="store_true",
                   help="don't push registration ids into event.registrations")
    a = p.parse_args()

    db = get_db()
    ev = find_event(db, a.event)
    push = not a.no_event_push
    is_team = ev.get("isTeamEvent", False)
    mn, mx = ev.get("minMembersPerTeam", 1), ev.get("maxMembersPerTeam", 1)
    print(f"{ev['eventName']} ({ev['slug']}) - {'team' if is_team else 'solo'} event, size {mn}-{mx}")

    if not is_team:
        if a.users:
            chosen = load_explicit(db, ev, a.users)
        elif a.random:
            pool = eligible_pool(db, ev)
            if a.random > len(pool):
                die(f"only {len(pool)} eligible users, asked for {a.random}")
            chosen = random.sample(pool, a.random)
        else:
            die("solo event: pass --users or --random N")
        register_solo(db, ev, chosen, a.verified, push)
        return

    if a.users:
        if not mn <= len(a.users) <= mx:
            die(f"team size {len(a.users)} outside allowed {mn}-{mx}")
        register_team(db, ev, load_explicit(db, ev, a.users), a.verified, push, a.team_name)
        return

    size = a.team_size
    if not size or not mn <= size <= mx:
        die(f"--team-size required and must be within {mn}-{mx}")
    pool = eligible_pool(db, ev)
    if a.teams * size > len(pool):
        die(f"need {a.teams * size} eligible users, only {len(pool)} available")
    random.shuffle(pool)
    for i in range(a.teams):
        register_team(db, ev, pool[i * size:(i + 1) * size], a.verified, push)


if __name__ == "__main__":
    main()