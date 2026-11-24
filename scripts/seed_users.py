#!/usr/bin/env python3
"""Fill missing fullName / phoneNumber / college on existing users. Never overwrites a field that already has a value.

  python seed_users.py --dry-run     # preview only
  python seed_users.py               # apply

fullName    : derived from email local part ("aryan.ghosh.cse27@..." -> "Aryan Ghosh"),
              falling back to the username with digits/underscores stripped.
phoneNumber : random 10-digit number starting 6-9, unique across all users.
college     : random pick from COLLEGES.
"""
import argparse
import random
import re

from common import get_db, now, users

COLLEGES = ["HITK", "THC", "IEM", "JU", "Techno"]


def missing(field):
    return {"$or": [{field: {"$exists": False}}, {field: None}, {field: ""}]}


def derive_name(u):
    local = u.get("email", "").split("@")[0]
    parts = [p for p in re.split(r"[._\-]+", local) if p and not re.search(r"\d", p)]
    if len(parts) >= 2:
        return " ".join(p.capitalize() for p in parts)
    uname = re.sub(r"[\d_]+", " ", u.get("username", "")).strip()
    return uname.title() or local.title() or "Unknown"


def new_phone(used):
    while True:
        n = random.choice("6789") + "".join(random.choice("0123456789") for _ in range(9))
        if n not in used:
            used.add(n)
            return n


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    a = p.parse_args()

    db = get_db()
    coll = users(db)
    used = {u["phoneNumber"] for u in coll.find({"phoneNumber": {"$nin": [None, ""]}}, {"phoneNumber": 1})}

    query = {"$or": [missing("fullName"), missing("phoneNumber"), missing("college")]}
    todo = list(coll.find(query))
    print(f"{coll.count_documents({})} users total, {len(todo)} need seeding")

    for u in todo:
        patch = {}
        if not u.get("fullName"):
            patch["fullName"] = derive_name(u)
        if not u.get("phoneNumber"):
            patch["phoneNumber"] = new_phone(used)
        if not u.get("college"):
            patch["college"] = random.choice(COLLEGES)
        print(f"  {u.get('email')}: {patch}")
        if not a.dry_run:
            patch["updatedAt"] = now()
            coll.update_one({"_id": u["_id"]}, {"$set": patch})

    print("dry run, nothing written" if a.dry_run else "done")


if __name__ == "__main__":
    main()