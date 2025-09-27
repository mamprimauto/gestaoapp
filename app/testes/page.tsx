import ABTestDashboard from "@/components/ab-test-dashboard"
import { SimpleABTestProvider } from "@/components/simple-ab-provider"

export default function TestesPage() {
  return (
    <SimpleABTestProvider>
      <ABTestDashboard />
    </SimpleABTestProvider>
  )
}