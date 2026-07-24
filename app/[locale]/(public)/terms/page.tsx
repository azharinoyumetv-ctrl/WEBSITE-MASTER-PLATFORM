import { generateMetadata as generateSiteMetadata } from '../../site/[...slug]/page'
import { redirect } from 'next/navigation'

export async function generateMetadata({ params }: { params: { locale: string } }) {
  return generateSiteMetadata({ params: { slug: ['terms'], ...params } })
}

export default async function TermsPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/site/terms`)
}
