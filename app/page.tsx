import { FarmWorkspace } from '@/components/farm-workspace'
import { DEFAULT_BOARD_PRICE_USD_T } from '@/config/rules'
import { getCases } from '@/lib/cases'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const cases = await getCases()
  return <FarmWorkspace cases={cases} defaultBoardPrice={DEFAULT_BOARD_PRICE_USD_T} />
}
