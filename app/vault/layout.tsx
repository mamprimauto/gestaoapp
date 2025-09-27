import AuthGuard from "@/components/auth-guard"
import PremiumLayout from "@/components/premium-layout"

export default function VaultLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <PremiumLayout>{children}</PremiumLayout>
    </AuthGuard>
  )
}