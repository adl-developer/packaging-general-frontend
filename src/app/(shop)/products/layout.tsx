import { OrdersPausedGate } from "@/components/orders-paused/orders-paused-gate";

// Settings → Order Acceptance OFF → the "Orders paused" page instead (2026-10-16).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <OrdersPausedGate>{children}</OrdersPausedGate>;
}