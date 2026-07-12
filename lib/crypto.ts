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
  
  try {
    if (textParts.length === 3) {
      // New format: salt:iv:ciphertext
      const [saltStr, ivStr, cipherStr] = textParts
      const salt = Buffer.from(saltStr, 'hex')
      const key = crypto.scryptSync(getEncryptionKey(), salt, 32)
      const iv = Buffer.from(ivStr, 'hex')
      const encryptedText = Buffer.from(cipherStr, 'hex')
      
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
      let decrypted = decipher.update(encryptedText)
      decrypted = Buffer.concat([decrypted, decipher.final()])
      return decrypted.toString()
    } else {
      // Invalid format
      return ''
    }
  } catch (e) {
    console.error('Decryption failed', e)
    return ''
  }
}

export function generateCheckoutNonce(tenantId: string): string {
  const expires = Date.now() + 1000 * 60 * 60; // 1 hour
  const payload = `${tenantId}:${expires}`;
  const hmac = crypto.createHmac('sha256', process.env.ENCRYPTION_KEY || 'fallback-key').update(payload).digest('hex');
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
    const expectedHmac = crypto.createHmac('sha256', process.env.ENCRYPTION_KEY || 'fallback-key').update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hmac, 'utf8'), Buffer.from(expectedHmac, 'utf8'));
  } catch (e) {
    return false;
  }
}
