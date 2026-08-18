import { ReleaseView } from '@/components/release/release-view'
import { getRelease, releases } from '@/lib/data'

export function generateStaticParams() {
  return releases.map((release) => ({ id: release.id }))
}

export default async function ReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ReleaseView releaseId={id} release={getRelease(id)} />
}
