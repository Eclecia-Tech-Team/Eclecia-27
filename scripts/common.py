"""Shared helpers. Config via env vars:
   MONGODB_URI (default mongodb://localhost:27017)
   MONGODB_DB  (default: db in the URI, else "test")
Collection names follow Mongoose pluralisation; override via env if yours differ.
"""
import os
import secrets
import sys
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import MongoClient
from pymongo.errors import ConfigurationError

try:  # optional: picks up MONGODB_URI / MONGODB_DB from a .env next to the scripts
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I


def get_db():
    uri = os.getenv("MONGODB_URI")
    if not uri:
        print("WARN: MONGODB_URI not set, using mongodb://localhost:27017", file=sys.stderr)
        uri = "mongodb://localhost:27017"
    client = MongoClient(uri)
    name = os.getenv("MONGODB_DB")
    if name:
        return client[name]
    try:
        return client.get_default_database()
    except ConfigurationError:
        print("WARN: no database name in URI and MONGODB_DB not set, using 'test'", file=sys.stderr)
        return client["test"]


def describe_connection(db):
    host = "?"
    try:
        host = ",".join(f"{h}:{p}" for h, p in db.client.nodes) or "?"
    except Exception:
        pass
    lines = [f"connected to host={host} db='{db.name}'"]
    try:
        cols = db.list_collection_names()
        lines.append(f"collections: {cols or '(none)'}")
        lines.append(f"events collection '{events(db).name}': {events(db).count_documents({})} docs")
        slugs = [e.get("slug") for e in events(db).find({}, {"slug": 1}).limit(5)]
        if slugs:
            lines.append(f"sample slugs: {slugs}")
        others = [n for n in db.client.list_database_names() if n not in ("admin", "local", "config")]
        lines.append(f"databases on this server: {others}")
    except Exception as e:
        lines.append(f"(could not inspect: {e})")
    return "\n".join(lines)


def col(db, key, default):
    return db[os.getenv(f"COL_{key.upper()}", default)]


def events(db):        return col(db, "events", "events")
def users(db):         return col(db, "users", "users")
def teams(db):         return col(db, "teams", "teams")
def registrations(db): return col(db, "registrations", "registrations")


def now():
    return datetime.now(timezone.utc)


def oid(value):
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        die(f"'{value}' is not a valid ObjectId")


def die(msg):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def find_event(db, ref):
    """ref = slug or _id string."""
    ev = events(db).find_one({"slug": ref})
    if not ev and ObjectId.is_valid(ref):
        ev = events(db).find_one({"_id": ObjectId(ref)})
    if not ev:
        print(describe_connection(db), file=sys.stderr)
        die(f"event '{ref}' not found (tried slug and _id). "
            "Check the connection above: set MONGODB_URI / MONGODB_DB (or COL_EVENTS) to match.")
    return ev


def unique_code(coll, field, prefix, length):
    while True:
        code = f"{prefix}-" + "".join(secrets.choice(ALPHABET) for _ in range(length))
        if not coll.find_one({field: code}, {"_id": 1}):
            return code