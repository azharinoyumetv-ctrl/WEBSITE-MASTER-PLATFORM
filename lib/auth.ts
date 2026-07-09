import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
export const authOptions: NextAuthOptions = {
  // @ts-ignore - Adapter type mismatch in some next-auth versions, safe to ignore
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login", // Error code passed in query string as ?error=
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials")
        }

        // We check across all users since we'll rely on the DB unique constraint
        const user = await prisma.user.findFirst({
          where: { email: credentials.email },
          include: { authCredential: true, tenant: true, userRoles: { include: { role: true } } }
        })

        if (!user) {
          throw new Error("Invalid credentials")
        }

        if (user.status === "suspended" || (user.tenant && user.tenant.status === "suspended")) {
          throw new Error("Account suspended")
        }

        let isValidPassword = false;

        // In a dual-table schema, check the dedicated auth credential table first
        if (user.authCredential?.passwordHash) {
          isValidPassword = await bcrypt.compare(credentials.password, user.authCredential.passwordHash);
        }

        // Fallback to the legacy user.passwordHash if the primary failed or didn't exist
        if (!isValidPassword && user.passwordHash) {
          isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
        }

        if (!isValidPassword) {
          throw new Error("Invalid credentials")
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          tenantId: user.tenantId,
          roles: user.userRoles.map(ur => ur.role.name),
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.tenantId = (user as any).tenantId
        token.roles = (user as any).roles
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).tenantId = token.tenantId as string;
        (session.user as any).roles = token.roles as string[];
      }
      return session
    }
  },
}
