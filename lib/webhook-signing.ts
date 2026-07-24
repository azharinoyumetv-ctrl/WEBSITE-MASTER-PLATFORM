import { decrypt, encrypt } from '@/lib/crypto'

/**
 * Keeps webhook signing secrets encrypted in storage while retaining support
 * for records created before encryption was introduced.
 */
export function storeWebhookSigningSecret(secret: string) {
  return encrypt(secret)
}

export function getWebhookSigningSecret(storedSecret: string) {
  return decrypt(storedSecret) || storedSecret
}
