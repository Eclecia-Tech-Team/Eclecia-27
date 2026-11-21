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
  searchParams: Promise<{ returnTo?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const returnTo = safeReturn(sp.returnTo);
  const initialTab = sp.tab === "events" || sp.tab === "teams" ? sp.tab : "details";
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
      key={initialTab}
      initialUsername={user.username}
      initialAvatar={user.avatar ?? null}
      initialEmail={user.email}
      returnTo={returnTo}
      initialTab={initialTab}
    />
  );
}
