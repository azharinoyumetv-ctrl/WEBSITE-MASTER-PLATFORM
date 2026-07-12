import prisma from '../lib/prisma'
import crypto from 'crypto'

// Old decryption fallback logic that we are rotating away from
const ALGORITHM = 'aes-256-cbc'
function legacyDecrypt(text: string): string {
  if (!text) return ''
  
  // Legacy raw hex (no colons)
  if (!text.includes(':')) {
    try {
      const legacyKey = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32)
      const legacyIv = Buffer.alloc(16, 0)
      const decipher = crypto.createDecipheriv(ALGORITHM, legacyKey, legacyIv)
      let decrypted = decipher.update(text, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (e) {
      return ''
    }
  }

  const textParts = text.split(':')
  if (textParts.length === 2) {
    // Intermediate legacy format: iv:ciphertext
    try {
      const [ivStr, cipherStr] = textParts
      const legacyKey = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32)
      const iv = Buffer.from(ivStr, 'hex')
      const encryptedText = Buffer.from(cipherStr, 'hex')
      
      const decipher = crypto.createDecipheriv(ALGORITHM, legacyKey, iv)
      let decrypted = decipher.update(encryptedText)
      decrypted = Buffer.concat([decrypted, decipher.final()])
      return decrypted.toString()
    } catch (e) {
      return ''
    }
  }
  
  // Already new format
  return ''
}

// New standard encryption
function encrypt(text: string): string {
  if (!text) return ''
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, salt, 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  
  return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted.toString('hex')
}

function needsRotation(ciphertext: string | null | undefined): boolean {
  if (!ciphertext) return false;
  return ciphertext.split(':').length < 3;
}

async function main() {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is required in environment variables for secure encryption.')
  }
  
  let rotatedCount = 0;

  // 1. TenantAiConfiguration
  const aiConfigs = await prisma.tenantAiConfiguration.findMany()
  for (const config of aiConfigs) {
    if (needsRotation(config.encryptedApiSecret)) {
      const decrypted = legacyDecrypt(config.encryptedApiSecret!)
      if (decrypted) {
        await prisma.tenantAiConfiguration.update({
          where: { id: config.id },
          data: { encryptedApiSecret: encrypt(decrypted) }
        })
        rotatedCount++
      }
    }
  }

  // 2. TenantWebsite
  const websites = await prisma.tenantWebsite.findMany()
  for (const site of websites) {
    const dataToUpdate: any = {}
    let siteNeedsUpdate = false

    if (needsRotation(site.xenditEncryptedSecret)) {
      const dec = legacyDecrypt(site.xenditEncryptedSecret!)
      if (dec) {
        dataToUpdate.xenditEncryptedSecret = encrypt(dec)
        siteNeedsUpdate = true
      }
    }
    if (needsRotation(site.xenditEncryptedWebhookToken)) {
      const dec = legacyDecrypt(site.xenditEncryptedWebhookToken!)
      if (dec) {
        dataToUpdate.xenditEncryptedWebhookToken = encrypt(dec)
        siteNeedsUpdate = true
      }
    }
    if (needsRotation(site.midtransEncryptedServerKey)) {
      const dec = legacyDecrypt(site.midtransEncryptedServerKey!)
      if (dec) {
        dataToUpdate.midtransEncryptedServerKey = encrypt(dec)
        siteNeedsUpdate = true
      }
    }

    if (siteNeedsUpdate) {
      await prisma.tenantWebsite.update({
        where: { id: site.id },
        data: dataToUpdate
      })
      rotatedCount++
    }
  }

  // 3. TenantAuthCredential
  const credentials = await prisma.tenantAuthCredential.findMany()
  for (const cred of credentials) {
    if (needsRotation(cred.mfaSecretEncrypted)) {
      const dec = legacyDecrypt(cred.mfaSecretEncrypted!)
      if (dec) {
        await prisma.tenantAuthCredential.update({
          where: { id: cred.id },
          data: { mfaSecretEncrypted: encrypt(dec) }
        })
        rotatedCount++
      }
    }
  }

  // 4. TenantNotificationGateway
  const gateways = await prisma.tenantNotificationGateway.findMany()
  for (const gw of gateways) {
    if (gw.encryptedCredentials && typeof gw.encryptedCredentials === 'object') {
      const configObj = gw.encryptedCredentials as any;
      if (needsRotation(configObj.password)) {
        const dec = legacyDecrypt(configObj.password)
        if (dec) {
          configObj.password = encrypt(dec)
          await prisma.tenantNotificationGateway.update({
            where: { id: gw.id },
            data: { encryptedCredentials: configObj }
          })
          rotatedCount++
        }
      }
    }
  }

  console.log(`Successfully rotated ${rotatedCount} records.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
