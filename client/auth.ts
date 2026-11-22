import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import mongoose from "mongoose";
import connect from "@/lib/mongoose";
import User from "@/lib/models/User";
import { reservedUsername, signInSchema } from "@/lib/validations/auth";
import { sendWelcomeEmail } from "@/lib/auth-mail";

export const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

const randomAvatar = () => Math.floor(Math.random() * 7) + 1;

const toPlainRoles = (roles: unknown): string[] => {
  if (!roles) return [];
  if (Array.isArray(roles)) {
    return Array.from(roles).map(String);
  }
  return [];
};

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = signInSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const { email, password } = parsed.data;
      await connect();

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user || user.provider === "google" || !user.passwordHash) return null;

      const valid = await user.comparePassword(password);
      if (!valid) return null;
      if (!user.verified) return null;

      let avatar = user.avatar;
      if (!avatar) {
        avatar = randomAvatar();
        await User.findByIdAndUpdate(user._id, { avatar });
      }

      return {
        id: user._id.toString(),
        name: user.username,
        email: user.email,
        image: user.image ?? undefined,
        avatar,
        roles: toPlainRoles(user.roles),
      };
    },
  }),
];

if (googleEnabled) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const email = user.email?.toLowerCase().trim();
      if (!email) return false;

      await connect();
      const existing = await User.findOne({ email });

      if (existing) {
        if (existing.provider === "credentials") {
          return "/login?error=use_credentials";
        }

        if (!existing.verified) {
          existing.emailVerified = new Date();
          existing.verified = true;
          await existing.save();
        }

        user.id = existing._id.toString();
        user.name = existing.username;
        (user as { avatar?: number }).avatar = existing.avatar;
        (user as { roles?: string[] }).roles = toPlainRoles(existing.roles);
        return true;
      }

      let usernameBase = (user.name ?? email.split("@")[0] ?? "guest")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 24)
        .padEnd(3, "0");
      // A Google name like "Eclecia Official" mustn't become a staff-looking handle.
      if (reservedUsername(usernameBase)) usernameBase = "guest";

      let usernameCandidate = usernameBase;
      let suffix = 1;
      while (await User.exists({ username: new RegExp(`^${usernameCandidate}$`, "i") })) {
        usernameCandidate = `${usernameBase}${suffix}`;
        suffix += 1;
      }

      const created = await User.create({
        username: usernameCandidate,
        email,
        provider: "google",
        image: user.image ?? undefined,
        avatar: randomAvatar(),
        emailVerified: new Date(),
        verified: true,
      });

      user.id = created._id.toString();
      user.name = created.username;
      (user as { avatar?: number }).avatar = created.avatar;
      (user as { roles?: string[] }).roles = toPlainRoles(created.roles);
      await sendWelcomeEmail(email, created.username).catch((err) =>
        console.error("[auth] welcome_mail_failed", err)
      );
      return true;
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        if (url === "/" || url === "/login" || url === "/register") return `${baseUrl}/profile`;
        return `${baseUrl}${url}`;
      }
      if (new URL(url).origin === baseUrl) {
        if (url === `${baseUrl}/` || url === `${baseUrl}/login` || url === `${baseUrl}/register`) {
          return `${baseUrl}/profile`;
        }
        return url;
      }
      return `${baseUrl}/profile`;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id ? String(user.id) : undefined;
        token.username = user.name ?? undefined;
        token.avatar =
          typeof (user as { avatar?: number }).avatar === "number"
            ? (user as { avatar?: number }).avatar
            : undefined;
        token.roles = toPlainRoles((user as { roles?: unknown }).roles);
      }

      // If token is missing MongoDB id or username (e.g. initial Google sign-in), lookup by email
      const rawId = (token.id as string) || (token.sub as string);
      const isInvalidMongoId = !rawId || !mongoose.Types.ObjectId.isValid(rawId);
      if ((isInvalidMongoId || !token.username) && token.email) {
        try {
          await connect();
          const dbUser = (await User.findOne({ email: (token.email as string).toLowerCase() })
            .select("username avatar roles")
            .lean()) as { _id: { toString(): string }; username?: string; avatar?: number; roles?: unknown } | null;
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.username = dbUser.username;
            if (typeof dbUser.avatar === "number") token.avatar = dbUser.avatar;
            if (dbUser.roles) token.roles = toPlainRoles(dbUser.roles);
          }
        } catch (err) {
          console.error("[auth] jwt email sync error:", err);
        }
      }

      if (trigger === "update") {
        // Fast direct update from client payload
        if (session?.user?.username) {
          token.username = session.user.username;
        } else if (session?.username) {
          token.username = session.username;
        }

        if (typeof session?.user?.avatar === "number") {
          token.avatar = session.user.avatar;
        } else if (typeof session?.avatar === "number") {
          token.avatar = session.avatar;
        }

        // Fresh database verification
        const userId = (token.id as string) || (token.sub as string);
        try {
          await connect();
          let freshUser = null;
          if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            freshUser = (await User.findById(userId)
              .select("username avatar roles")
              .lean()) as { _id: { toString(): string }; username?: string; avatar?: number; roles?: unknown } | null;
          }
          if (!freshUser && token.email) {
            freshUser = (await User.findOne({ email: (token.email as string).toLowerCase() })
              .select("username avatar roles")
              .lean()) as { _id: { toString(): string }; username?: string; avatar?: number; roles?: unknown } | null;
          }
          if (freshUser) {
            token.id = freshUser._id.toString();
            if (freshUser.username) token.username = freshUser.username;
            if (typeof freshUser.avatar === "number") token.avatar = freshUser.avatar;
            if (freshUser.roles) token.roles = toPlainRoles(freshUser.roles);
          }
        } catch (err) {
          console.error("[auth] jwt update session error:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string) || "";
        session.user.username = (token.username as string) || undefined;
        session.user.name = (token.username as string) || session.user.name || undefined;
        session.user.avatar = token.avatar as number | undefined;
        session.user.roles = toPlainRoles(token.roles);
      }
      return session;
    },
  },
});
