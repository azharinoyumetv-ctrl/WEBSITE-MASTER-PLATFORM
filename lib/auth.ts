import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import crypto from "crypto"
import * as OTPAuth from "otpauth"
import { checkRateLimit } from "@/lib/rate-limit"
import { decrypt } from "@/lib/crypto"

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
        password: { label: "Password", type: "password" },
        captchaToken: { label: "Captcha Token", type: "text" },
        captchaAnswer: { label: "Captcha Answer", type: "text" },
        mfaCode: { label: "MFA Code", type: "text" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials")
        }

        const ip = (req.headers as any)?.['x-forwarded-for'] || (req.headers as any)?.['x-real-ip'] || 'unknown'
        
        const rl = await checkRateLimit(ip, 'auth', 20, 15 * 60 * 1000)
        if (rl.limited) {
          throw new Error("Too many attempts. Please try again later.")
        }

        if (rl.count > 3) {
          const { captchaToken, captchaAnswer } = credentials
          if (!captchaToken || !captchaAnswer) {
            throw new Error("CAPTCHA_REQUIRED")
          }
          try {
            const decrypted = decrypt(captchaToken)
            if (!decrypted) throw new Error('Decryption failed')
            const payload = JSON.parse(decrypted)

            if (payload.expires < Date.now()) throw new Error('Expired')
            if (payload.answer !== captchaAnswer.toLowerCase()) throw new Error('Wrong answer')
            
            // Valid captcha, reset count
            await prisma.systemApiRateLimit.update({
              where: { id: rl.id },
              data: { count: 0 }
            })
          } catch (e) {
            throw new Error("INVALID_CAPTCHA")
          }
        }
        // -------------------------------

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

        const currentHash = user.authCredential?.passwordHash || user.passwordHash;
        if (currentHash) {
          const cost = bcrypt.getRounds(currentHash);
          if (cost < 12) {
            const newHash = await bcrypt.hash(credentials.password, 12);
            if (user.authCredential) {
              await prisma.tenantAuthCredential.update({
                where: { id: user.authCredential.id },
                data: { passwordHash: newHash }
              });
            } else {
              await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: newHash }
              });
            }
          }
        }

        // --- MFA Verification ---
        if (user.authCredential?.isMfaEnabled && user.authCredential.mfaSecretEncrypted) {
          const { mfaCode } = credentials
          if (!mfaCode) {
            throw new Error("MFA_REQUIRED")
          }
          try {
            const mfaSecret = decrypt(user.authCredential.mfaSecretEncrypted)
            if (!mfaSecret) throw new Error('Decryption failed')
            const totp = new OTPAuth.TOTP({
              secret: OTPAuth.Secret.fromBase32(mfaSecret)
            })
            const delta = totp.validate({ token: mfaCode, window: 1 })
            if (delta === null) {
              throw new Error("INVALID_MFA")
            }
          } catch (e) {
            throw new Error("INVALID_MFA")
          }
        }
        // ------------------------

        const sessionId = crypto.randomBytes(32).toString('hex')
        await prisma.tenantRefreshToken.create({
           data: {
             tenantId: user.tenantId,
             userId: user.id,
             tokenHash: sessionId,
             expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
           }
        })

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          tenantId: user.tenantId,
          roles: user.userRoles.map(ur => ur.role.name),
          sessionId,
          tokenVersion: user.tokenVersion
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
        token.sessionId = (user as any).sessionId
        token.tokenVersion = (user as any).tokenVersion
      }
      
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { tokenVersion: true }
        })
        if (!dbUser || dbUser.tokenVersion !== token.tokenVersion) {
          // Token version mismatch or user deleted
          return {} as any
        }
      }

      if (token.sessionId) {
        const dbToken = await prisma.tenantRefreshToken.findUnique({ 
          where: { tokenHash: token.sessionId as string },
          select: { id: true, isRevoked: true, isUsed: true, familyId: true, tenantId: true, userId: true }
        })
        if (!dbToken || dbToken.isRevoked) {
          // Token has been revoked or deleted
          return {} as any
        }
        
        // Refresh token rotation on use (simulate access token expiry every 15 mins)
        const lastRefreshed = (token.lastRefreshed as number) || Date.now();
        if (Date.now() - lastRefreshed > 15 * 60 * 1000) {
          if (dbToken.isUsed) {
            // Re-use detected! Nuclear revocation
            await prisma.tenantRefreshToken.updateMany({
              where: { userId: dbToken.userId },
              data: { isRevoked: true }
            })
            return {} as any
          }
          
          // Mark old token as used
          await prisma.tenantRefreshToken.update({
            where: { id: dbToken.id },
            data: { isUsed: true }
          })
          
          // Create new token
          const newSessionId = crypto.randomBytes(32).toString('hex')
          await prisma.tenantRefreshToken.create({
            data: {
              tenantId: dbToken.tenantId,
              userId: dbToken.userId,
              tokenHash: newSessionId,
              familyId: dbToken.familyId || dbToken.id,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
          })
          
          token.sessionId = newSessionId
          token.lastRefreshed = Date.now()
        }
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
