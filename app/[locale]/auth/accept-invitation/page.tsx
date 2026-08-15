import { AcceptInvitationClient } from './accept-invitation-client'

export default async function AcceptInvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return <AcceptInvitationClient token={token || ''} />
}

