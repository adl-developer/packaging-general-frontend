import { Clock } from "lucide-react";
import { formatTime12h, getOutsideHoursInfo } from "@/lib/site-content";

/**
 * "You're ordering outside our working hours" — shown at the top of checkout
 * when the store's configured business hours (Settings → Business Hours in
 * the admin portal) say the store is currently closed, evaluated in Ghana
 * time (Africa/Accra).
 *
 * Renders NOTHING when hours were never configured, when the backend is
 * unreachable, or when the store is open right now — an invented warning
 * about hours nobody set would be worse than none. Purely informational:
 * ordering is never blocked, the customer is just told processing may wait
 * for the next working day.
 */
export async function BusinessHoursNotice() {
  const outside = await getOutsideHoursInfo();
  if (!outside) return null;

  const { today, dayLabel } = outside;
  const todayLine = today.open
    ? `Our working hours today (${dayLabel}) are ${formatTime12h(today.from)} – ${formatTime12h(today.to)}.`
    : `We are closed on ${dayLabel}s.`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div
        role="status"
        className="mx-auto flex max-w-2xl items-start gap-3 rounded-card border border-[rgba(165,154,135,0.4)] bg-surface px-4 py-3"
      >
        <Clock className="mt-0.5 size-4 shrink-0 text-rust" aria-hidden />
        <p className="text-sm leading-6 text-brand">
          <span className="font-semibold">
            You&apos;re ordering outside our working hours.
          </span>{" "}
          {todayLine} You can still place your order now — we&apos;ll start
          processing it when we&apos;re next open, so confirmation and delivery
          may take a little longer than usual.
        </p>
      </div>
    </div>
  );
}
