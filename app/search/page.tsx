import { Suspense } from 'react'
import { SearchView } from '@/components/search/search-view'

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-12"><div className="skel h-8 w-64" /></div>}>
      <SearchView />
    </Suspense>
  )
}
