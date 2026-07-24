import { generateMetadata as generateSiteMetadata } from '../../site/[...slug]/page'
import { redirect } from 'next/navigation'

export async function generateMetadata({ params }: { params: { locale: string } }) {
  return generateSiteMetadata({ params: { slug: ['shop'], ...params } })
}

export default async function ShopPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/site/shop`)
}
