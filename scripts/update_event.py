#!/usr/bin/env python3
"""Update min/max team size on an event and recompute isTeamEvent (= max > 1).

  python update_event.py veritasium --min 1 --max 1
  python update_event.py hackathon  --min 2 --max 4
  python update_event.py hackathon  --max 5            # min stays as is
"""
import argparse

from common import die, events, find_event, get_db, registrations


def main():
    p = argparse.ArgumentParser()
    p.add_argument("event", help="event slug or _id")
    p.add_argument("--min", type=int, dest="min_m")
    p.add_argument("--max", type=int, dest="max_m")
    p.add_argument("--force", action="store_true",
                   help="allow flipping solo<->team even if registrations already exist")
    a = p.parse_args()
    if a.min_m is None and a.max_m is None:
        die("give at least one of --min / --max")

    db = get_db()
    ev = find_event(db, a.event)

    new_min = a.min_m if a.min_m is not None else ev.get("minMembersPerTeam", 1)
    new_max = a.max_m if a.max_m is not None else ev.get("maxMembersPerTeam", 1)
    if new_min < 1:
        die("min must be >= 1")
    if new_max < new_min:
        die(f"max ({new_max}) must be >= min ({new_min})")
    is_team = new_max > 1

    n_regs = registrations(db).count_documents({"eventId": ev["_id"]})
    if n_regs and is_team != ev.get("isTeamEvent", False) and not a.force:
        die(f"{n_regs} registrations already exist and this flips isTeamEvent "
            f"({ev.get('isTeamEvent')} -> {is_team}). Re-run with --force if intended.")
    if n_regs and is_team:
        print(f"WARN: {n_regs} existing registrations; existing teams are not re-validated against new limits.")

    update = {"minMembersPerTeam": new_min, "maxMembersPerTeam": new_max, "isTeamEvent": is_team}
    events(db).update_one({"_id": ev["_id"]}, {"$set": update})

    print(f"{ev['eventName']} ({ev['slug']})")
    print(f"  min: {ev.get('minMembersPerTeam')} -> {new_min}")
    print(f"  max: {ev.get('maxMembersPerTeam')} -> {new_max}")
    print(f"  isTeamEvent: {ev.get('isTeamEvent')} -> {is_team}")


if __name__ == "__main__":
    main()
