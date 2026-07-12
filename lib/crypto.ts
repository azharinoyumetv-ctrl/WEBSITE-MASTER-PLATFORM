import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16 // For AES, this is always 16

if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY is required in environment variables for secure encryption.')
}

export function encrypt(text: string): string {
  if (!text) return ''
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, salt, 32)
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
      const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, salt, 32)
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
