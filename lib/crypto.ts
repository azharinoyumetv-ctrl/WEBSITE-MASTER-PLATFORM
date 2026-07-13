import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16 // For AES, this is always 16

function getEncryptionKey(): Buffer {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is required in environment variables for secure encryption.')
  }
  return Buffer.from(process.env.ENCRYPTION_KEY, 'utf-8')
}

export function encrypt(text: string): string {
  if (!text) return ''
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(getEncryptionKey(), salt, 32)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  
  return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decrypt(text: string): string {
  if (!text) return ''
  
  const textParts = text.split(':')
  if (textParts.length !== 3) return ''

  const [saltStr, ivStr, cipherStr] = textParts
  const salt = Buffer.from(saltStr, 'hex')
  const iv = Buffer.from(ivStr, 'hex')
  const encryptedText = Buffer.from(cipherStr, 'hex')

  try {
    const primaryKey = getEncryptionKey()
    const key = crypto.scryptSync(primaryKey, salt, 32)
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  } catch (primaryErr) {
    try {
      const fallbackKey = Buffer.from('fallback-key', 'utf-8')
      const key = crypto.scryptSync(fallbackKey, salt, 32)
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
      let decrypted = decipher.update(encryptedText)
      decrypted = Buffer.concat([decrypted, decipher.final()])
      console.warn('Decryption succeeded using dev fallback-key. Ensure this record is re-saved to migrate to the new encryption key.')
      return decrypted.toString()
    } catch (fallbackErr: any) {
      console.error('Decryption failed with both primary and dev fallback key:', fallbackErr?.message || fallbackErr)
      return ''
    }
  }
}

export function generateCheckoutNonce(tenantId: string): string {
  const expires = Date.now() + 1000 * 60 * 60; // 1 hour
  const payload = `${tenantId}:${expires}`;
  const hmac = crypto.createHmac('sha256', getEncryptionKey()).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64');
}

export function validateCheckoutNonce(nonce: string, tenantId: string): boolean {
  if (!nonce) return false;
  try {
    const decoded = Buffer.from(nonce, 'base64').toString('utf8');
    const [payloadTenantId, expiresStr, hmac] = decoded.split(':');
    if (payloadTenantId !== tenantId) return false;
    if (Date.now() > parseInt(expiresStr)) return false;
    
    const payload = `${tenantId}:${expiresStr}`;
    
    try {
      const expectedHmac = crypto.createHmac('sha256', getEncryptionKey()).update(payload).digest('hex');
      if (crypto.timingSafeEqual(Buffer.from(hmac, 'utf8'), Buffer.from(expectedHmac, 'utf8'))) {
        return true;
      }
    } catch (e) {
      // Primary key failed or was missing
    }

    const fallbackHmac = crypto.createHmac('sha256', Buffer.from('fallback-key', 'utf-8')).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hmac, 'utf8'), Buffer.from(fallbackHmac, 'utf8'));
  } catch (e) {
    return false;
  }
}
