/**
 * Gives a registration ID (REG-XXXXXXXX) to every registration made before IDs existed.
 * Safe to re-run: only touches registrations without one.
 *
 *   bun --env-file=.env.local scripts/backfill-registration-codes.ts
 */
import mongoose from "mongoose";
import Registration from "../lib/models/Registrations";
import generateCode from "../lib/generateTeamID";

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI (put it in client/.env.local)");
  await mongoose.connect(process.env.MONGODB_URI);
  await Registration.syncIndexes();

  const missing = await Registration.find({ registrationCode: { $exists: false } }).select("_id").lean<{ _id: mongoose.Types.ObjectId }[]>();
  let done = 0;
  for (const { _id } of missing) {
    for (let attempt = 0; ; attempt++) {
      try {
        await Registration.updateOne({ _id, registrationCode: { $exists: false } }, { $set: { registrationCode: `REG-${generateCode()}` } });
        done++;
        break;
      } catch (error) {
        if ((error as { code?: number }).code !== 11000 || attempt >= 4) throw error;
      }
    }
  }
  console.log(`Backfilled ${done} of ${missing.length} registrations.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
