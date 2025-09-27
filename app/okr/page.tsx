import OKRDashboardV2 from "@/components/okr-dashboard-v2"
import { OKRDataProvider } from "@/components/okr-data-context"

export default function OKRPage() {
  return (
    <OKRDataProvider>
      <OKRDashboardV2 />
    </OKRDataProvider>
  )
}