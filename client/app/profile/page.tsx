import { redirect } from "next/navigation";
import { auth } from "@/auth";
import connect from "@/lib/mongoose";
import User from "@/lib/models/User";
import ProfileClient from "./ProfileClient";

/** Only same-site paths, so the link can't be pointed off-site. */
const safeReturn = (value?: string) => (value && value.startsWith("/") && !value.startsWith("//") ? value : undefined);

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const returnTo = safeReturn((await searchParams).returnTo);
  const self = returnTo ? `/profile?returnTo=${encodeURIComponent(returnTo)}` : "/profile";
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(self)}`);
  }

  await connect();

  const user = (await User.findById(session.user.id)
    .select("username avatar email")
    .lean()) as { username: string; avatar?: number; email: string } | null;

  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(self)}`);
  }

  return (
    <ProfileClient
      initialUsername={user.username}
      initialAvatar={user.avatar ?? null}
      initialEmail={user.email}
      returnTo={returnTo}
    />
  );
}
