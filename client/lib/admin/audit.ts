import connect from "@/lib/mongoose";
import AdminAction from "@/lib/models/AdminAction";
import LoginThrottle from "@/lib/models/LoginThrottle";
import type { AdminIdentity } from "@/lib/admin/access";

/** Record an admin action. Never throws: a logging hiccup must not undo the action. */
export async function audit(who: Pick<AdminIdentity, "email">, action: string, target = "", detail = "") {
  try {
    await connect();
    await AdminAction.create({ by: who.email, action, target: target.slice(0, 200), detail: detail.slice(0, 500) });
  } catch (err) {
    console.error("[admin] audit write failed", err);
  }
}

/**
 * Failure counter. `hit` adds one and says whether the key is now over its
 * limit; `blocked` only checks. Atomic ($inc), so parallel guesses all count.
 */
export const throttle = {
  async blocked(key: string, limit: number) {
    await connect();
    const row = await LoginThrottle.findOne({ key, expiresAt: { $gt: new Date() } }).select("count").lean<{ count: number }>();
    return (row?.count ?? 0) >= limit;
  },
  async hit(key: string, windowMin: number) {
    await connect();
    const now = new Date();
    // A fresh window starts when the old row has expired (TTL cleanup can lag a minute).
    await LoginThrottle.deleteOne({ key, expiresAt: { $lte: now } });
    await LoginThrottle.updateOne(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(now.getTime() + windowMin * 60_000) } },
      { upsert: true },
    );
  },
  async clear(key: string) {
    await connect();
    await LoginThrottle.deleteOne({ key });
  },
};
