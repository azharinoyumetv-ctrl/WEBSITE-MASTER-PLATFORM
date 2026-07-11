import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();
const ALGORITHM = 'aes-256-cbc';

async function main() {
  if (!process.env.ENCRYPTION_KEY) {
    console.error("ERROR: ENCRYPTION_KEY is required in environment variables.");
    process.exit(1);
  }

  const OLD_KEY = crypto.scryptSync('default_insecure_key_for_dev_only', 'salt', 32);
  const NEW_KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);

  function decryptOld(text: string): string {
    if (!text) return '';
    const textParts = text.split(':');
    const ivStr = textParts.shift();
    if (!ivStr) return '';
    
    try {
      const iv = Buffer.from(ivStr, 'hex');
      const encryptedText = Buffer.from(textParts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, OLD_KEY, iv);
      
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (e) {
      return '';
    }
  }

  function encryptNew(text: string): string {
    if (!text) return '';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, NEW_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  console.log("Starting crypto rotation...");

  // Rotate TenantWebsite
  const websites = await prisma.tenantWebsite.findMany();
  let rotatedSites = 0;
  for (const site of websites) {
    const updates: any = {};
    
    // Xendit Secret
    if (site.xenditEncryptedSecret && site.xenditEncryptedSecretIv) {
      const decrypted = decryptOld(`${site.xenditEncryptedSecretIv}:${site.xenditEncryptedSecret}`);
      if (decrypted) {
        const encryptedNew = encryptNew(decrypted);
        const [iv, ciphertext] = encryptedNew.split(':');
        updates.xenditEncryptedSecret = ciphertext;
        updates.xenditEncryptedSecretIv = iv;
      }
    }

    // Xendit Webhook Token
    if (site.xenditEncryptedWebhookToken && site.xenditEncryptedWebhookTokenIv) {
      const decrypted = decryptOld(`${site.xenditEncryptedWebhookTokenIv}:${site.xenditEncryptedWebhookToken}`);
      if (decrypted) {
        const encryptedNew = encryptNew(decrypted);
        const [iv, ciphertext] = encryptedNew.split(':');
        updates.xenditEncryptedWebhookToken = ciphertext;
        updates.xenditEncryptedWebhookTokenIv = iv;
      }
    }

    // Midtrans Server Key
    if (site.midtransEncryptedServerKey && site.midtransEncryptedServerKeyIv) {
      const decrypted = decryptOld(`${site.midtransEncryptedServerKeyIv}:${site.midtransEncryptedServerKey}`);
      if (decrypted) {
        const encryptedNew = encryptNew(decrypted);
        const [iv, ciphertext] = encryptedNew.split(':');
        updates.midtransEncryptedServerKey = ciphertext;
        updates.midtransEncryptedServerKeyIv = iv;
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.tenantWebsite.update({
        where: { id: site.id },
        data: updates
      });
      rotatedSites++;
    }
  }
  console.log(`Rotated secrets for ${rotatedSites} TenantWebsites.`);

  // Rotate TenantAiConfiguration
  const aiConfigs = await prisma.tenantAiConfiguration.findMany();
  let rotatedAi = 0;
  for (const ai of aiConfigs) {
    if (ai.encryptedApiSecret) {
      const decrypted = decryptOld(ai.encryptedApiSecret);
      if (decrypted) {
        const encryptedNew = encryptNew(decrypted);
        await prisma.tenantAiConfiguration.update({
          where: { id: ai.id },
          data: { encryptedApiSecret: encryptedNew }
        });
        rotatedAi++;
      }
    }
  }
  console.log(`Rotated secrets for ${rotatedAi} TenantAiConfigurations.`);

  console.log("Crypto rotation completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
