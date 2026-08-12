import { AcceptInvitationClient } from './accept-invitation-client'

export default function AcceptInvitationPage({ searchParams }: { searchParams: { token?: string } }) {
  return <AcceptInvitationClient token={searchParams.token || ''} />
}
