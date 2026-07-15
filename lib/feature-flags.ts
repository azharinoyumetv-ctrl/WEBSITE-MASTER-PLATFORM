import prisma from '@/lib/prisma'

export const DEFAULT_FEATURE_FLAGS = [
  {
    flagKey: 'project_setup_intake',
    description: 'Allow public visitors to submit Project Setup requests from the DagangOS storefront.',
    defaultState: true,
    environment: 'production',
  },
  {
    flagKey: 'public_support_chat',
    description: 'Allow visitors to use the scoped DagangOS Website Master to Hermes support-chat relay.',
    defaultState: true,
    environment: 'production',
  },
] as const

/** Ensures the platform exposes only flags that are wired to real behavior. */
export async function ensureDefaultFeatureFlags() {
  await prisma.systemFeatureFlag.createMany({
    data: [...DEFAULT_FEATURE_FLAGS],
    skipDuplicates: true,
  })
}

export async function isTenantFeatureEnabled(tenantId: string, flagKey: string, subject = '') {
  const flag = await prisma.systemFeatureFlag.findUnique({
    where: { flagKey },
    include: {
      overrides: {
        where: { tenantId },
        select: { isEnabled: true, rolloutPercentage: true },
        take: 1,
      },
    },
  })

  // A missing registry entry must not accidentally disable an established
  // public workflow during a rollout. Seeded flags always use their real state.
  if (!flag) return true

  const override = flag.overrides[0]
  const isEnabled = override?.isEnabled ?? flag.defaultState
  const rolloutPercentage = override?.rolloutPercentage ?? 100
  if (!isEnabled || rolloutPercentage <= 0) return false
  if (rolloutPercentage >= 100 || !subject) return true

  let hash = 5381
  for (const character of `${tenantId}:${flagKey}:${subject}`) {
    hash = (hash * 33) ^ character.charCodeAt(0)
  }
  return (hash >>> 0) % 100 < rolloutPercentage
}
