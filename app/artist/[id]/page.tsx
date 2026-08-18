import { notFound } from 'next/navigation'
import { ArtistView } from '@/components/artist/artist-view'
import { artists, getArtist } from '@/lib/data'

export function generateStaticParams() {
  return artists.map((a) => ({ id: a.id }))
}

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const artist = getArtist(id)
  if (!artist) notFound()
  return <ArtistView artist={artist} />
}
