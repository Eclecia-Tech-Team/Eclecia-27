#!/usr/bin/env python3
"""Resolve a payment.

Team (payment is per team; team doc exists):
  python update_payment.py --team-code TEAM-ABC123 --status success
      -> team.paymentStatus = "completed", ALL member registrations verified = true
  python update_payment.py --team-code TEAM-ABC123 --status failed
      -> team.paymentStatus = "failed",    member registrations verified = false

Solo (no team doc):
  python update_payment.py --registration-code REG-ABCD2345 --status success   # verified = true
  python update_payment.py --registration-code REG-ABCD2345 --status failed    # verified = false
"""
import argparse

from common import die, now, registrations, teams, get_db


def main():
    p = argparse.ArgumentParser()
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--team-code")
    g.add_argument("--registration-code")
    p.add_argument("--status", choices=["success", "failed"], required=True)
    a = p.parse_args()

    db = get_db()
    ok = a.status == "success"
    t = now()

    if a.team_code:
        team = teams(db).find_one({"teamCode": a.team_code.upper()})
        if not team:
            die(f"team '{a.team_code}' not found")
        res = registrations(db).update_many(
            {"teamId": team["_id"]}, {"$set": {"verified": ok, "updatedAt": t}})
        teams(db).update_one(
            {"_id": team["_id"]},
            {"$set": {"paymentStatus": "completed" if ok else "failed", "updatedAt": t}})
        print(f"{team['teamCode']} ({team.get('teamName')}): paymentStatus -> "
              f"{'completed' if ok else 'failed'}; {res.modified_count}/{res.matched_count} "
              f"registrations set verified={ok}")
        return

    reg = registrations(db).find_one({"registrationCode": a.registration_code.upper()})
    if not reg:
        die(f"registration '{a.registration_code}' not found")
    if reg.get("isInTeam"):
        die("this registration belongs to a team; payment is per team, use --team-code")
    registrations(db).update_one({"_id": reg["_id"]}, {"$set": {"verified": ok, "updatedAt": t}})
    print(f"{reg['registrationCode']}: verified -> {ok}")


if __name__ == "__main__":
    main()
