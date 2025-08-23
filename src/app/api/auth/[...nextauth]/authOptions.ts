import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Define the user type that matches our schema
type AuthUser = {
  id: string;
  name: string;
  role: "staff" | "manager";
  staffCode: string;
};

export const authOptions: import("next-auth").AuthOptions = {
  providers: [
    Credentials({
      name: "PIN",
      credentials: {
        staffCode: { label: "Staff Code", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.staffCode || !creds?.pin) return null;
        const [u] = await db
          .select({
            id: schema.staffUsers.id,
            fullName: schema.staffUsers.fullName,
            staffCode: schema.staffUsers.staffCode,
            role: schema.staffUsers.role,
            pinHash: schema.staffUsers.pinHash,
          })
          .from(schema.staffUsers)
          .where(eq(schema.staffUsers.staffCode, creds.staffCode))
          .limit(1);

        if (!u) return null;
        const ok = await bcrypt.compare(String(creds.pin), u.pinHash);
        if (!ok) return null;

        // Return properly typed user object
        return {
          id: u.id,
          name: u.fullName,
          role: u.role,
          staffCode: u.staffCode,
        } as AuthUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, copy fields from `user` to the token
      if (user) {
        const authUser = user as AuthUser;
        token.id = authUser.id;
        token.role = authUser.role;
        token.staffCode = authUser.staffCode;
      }

      // If role is still missing (e.g., other providers), fetch it by staffCode
      if (!token.role && token.staffCode) {
        const [u] = await db
          .select({ role: schema.staffUsers.role })
          .from(schema.staffUsers)
          .where(eq(schema.staffUsers.staffCode, token.staffCode))
          .limit(1);
        if (u?.role) token.role = u.role;
      }

      return token;
    },
    async session({ session, token }) {
      // Mirror token → session with proper typing
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "staff" | "manager";
        session.user.staffCode = token.staffCode as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
};
