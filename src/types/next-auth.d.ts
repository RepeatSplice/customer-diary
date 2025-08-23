import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "staff" | "manager";
      staffCode: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "staff" | "manager";
    staffCode: string;
    id: string;
  }
}
