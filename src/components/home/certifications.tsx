import {
  ShieldCheck,
  Award,
  Check,
  Leaf,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

const RUST = "#964022";
const MUTED = "#7a7575";

// Per-card border + accent colors taken verbatim from the Figma.
const certifications: {
  icon: LucideIcon;
  label: string;
  color: string;
  border: string;
}[] = [
  {
    icon: ShieldCheck,
    label: "ISO 9001 with GSA Ghana",
    color: RUST,
    border: "rgba(150,64,34,0.3)",
  },
  {
    icon: Award,
    label: "ECOWAS Harmonized Standards (via GSA)",
    color: MUTED,
    border: "rgba(164,154,135,0.4)",
  },
  {
    icon: Check,
    label: "PPA Registered Supplier (Ghana)",
    color: MUTED,
    border: "rgba(40,40,39,0.2)",
  },
  {
    icon: Leaf,
    label: "Forestry Commission Ghana compliant",
    color: RUST,
    border: "rgba(164,154,135,0.5)",
  },
  {
    icon: ShieldCheck,
    label: "FDA Ghana Certified",
    color: RUST,
    border: "rgba(150,64,34,0.4)",
  },
  {
    icon: Award,
    label: "Ghana Standards Authority (GSA)",
    color: MUTED,
    border: "rgba(164,154,135,0.3)",
  },
];

export function Certifications() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Reveal className="rounded-card bg-surface p-8">
          <h2 className="mb-8 text-center text-sm font-semibold text-brand">
            Quality &amp; Compliance Certifications
          </h2>

          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {certifications.map(({ icon: Icon, label, color, border }) => (
              <li
                key={label}
                className="flex h-24 flex-col items-center justify-center gap-2 rounded-option border bg-[rgba(164,154,135,0.15)] px-3 text-center"
                style={{ borderColor: border }}
              >
                <Icon className="size-8" style={{ color }} aria-hidden />
                <span
                  className="text-xs font-medium leading-tight"
                  style={{ color }}
                >
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
