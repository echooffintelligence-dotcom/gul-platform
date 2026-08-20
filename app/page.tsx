import { ChartTable } from '@/components/chart/chart-table'
import { MyWaveCard } from '@/components/player/my-wave'

export default function ChartPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-12 sm:pb-24">
      <MyWaveCard />
      <ChartTable />
    </div>
  )
}
