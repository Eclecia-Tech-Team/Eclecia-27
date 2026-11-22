"use server";

import { z } from "zod";
import connect from "@/lib/mongoose";
import User from "@/lib/models/User";
import { guard } from "@/lib/admin/session";
import { audit } from "@/lib/admin/audit";
import { firstIssue } from "@/lib/admin/event-input";
import type { ActionResult } from "./events";

const participantInput = z.object({
  username: z.string().trim().min(3, "Username: 3–30 characters").max(30, "Username: 3–30 characters"),
  fullName: z.string().trim().max(80),
  phoneNumber: z.string().trim().regex(/^(\d{10})?$/, "Phone number: 10 digits"),
  college: z.string().trim().max(120),
  stream: z.string().trim().max(80),
});

export type ParticipantInput = z.input<typeof participantInput>;

/** Fix a participant's profile (typos, wrong phone). Email stays theirs to change. */
export async function updateParticipant(id: string, input: ParticipantInput): Promise<ActionResult> {
  const g = await guard("participants", true);
  if (!g.ok) return g;
  if (!/^[a-f\d]{24}$/i.test(id)) return { ok: false, error: "Participant not found." };
  const parsed = participantInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const p = parsed.data;

  await connect();
  const user = await User.findById(id);
  if (!user) return { ok: false, error: "Participant not found." };
  user.username = p.username;
  user.fullName = p.fullName;
  user.phoneNumber = p.phoneNumber;
  user.college = p.college;
  user.stream = p.stream;
  // Same rule as the profile page.
  user.isProfileComplete = Boolean(user.username && user.email && p.fullName && p.phoneNumber && p.college && p.stream);
  try {
    await user.save();
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { ok: false, error: "That username is taken." };
    throw err;
  }
  await audit(g.admin, "edited participant", user.email);
  return { ok: true };
}
