import type { Metadata } from "next";
import { ShoppingCart, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Design System",
  robots: { index: false, follow: false },
};

const swatches = [
  { name: "background", className: "bg-background", hex: "#e8e5de" },
  { name: "surface", className: "bg-surface", hex: "#fefdfb" },
  { name: "brand", className: "bg-brand", hex: "#3d3428" },
  { name: "muted", className: "bg-muted", hex: "#7a7575" },
  { name: "line", className: "bg-line", hex: "#c4bcb0" },
  { name: "accent", className: "bg-accent", hex: "#b8a8d9" },
  { name: "plum", className: "bg-plum", hex: "#9b6b8f" },
  { name: "rust", className: "bg-rust", hex: "#964022" },
  { name: "dark", className: "bg-dark", hex: "#282827" },
  { name: "destructive", className: "bg-destructive", hex: "#e7000b" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemShowcase() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-12">
      <div>
        <p className="text-2xl font-bold tracking-tight">Design System</p>
        <p className="text-sm text-muted">
          Tokens and primitives derived from the PG Figma. Internal reference.
        </p>
      </div>

      <Section title="Colors">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {swatches.map((s) => (
            <div key={s.name} className="flex flex-col gap-2">
              <div
                className={`${s.className} h-16 rounded-option border border-line`}
              />
              <div className="text-sm">
                <p className="font-medium">{s.name}</p>
                <p className="text-muted">{s.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography (Inter)">
        <div className="flex flex-col gap-1">
          <p className="text-lg font-bold tracking-tight">Bold 18 — Heading</p>
          <p className="text-base font-medium tracking-tight">
            Medium 16 — Subheading
          </p>
          <p className="text-sm">Regular 14 — Body copy and form labels.</p>
          <p className="text-xs text-muted">
            Regular 12 — Muted supporting text.
          </p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Pay GH₵ 279.37</Button>
          <Button variant="outline">Apply</Button>
          <Button variant="ghost">Back to Delivery</Button>
          <Button variant="outline" size="sm">
            <ShoppingCart className="size-4" />
            Cart
          </Button>
          <Button variant="outline" size="sm">
            Account
            <ChevronDown className="size-3" />
          </Button>
        </div>
      </Section>

      <Section title="Badge">
        <div className="flex items-center gap-3">
          <span className="relative inline-flex">
            <Button variant="outline" size="sm">
              <ShoppingCart className="size-4" />
              Cart
            </Button>
            <Badge className="absolute -right-2 -top-2">2</Badge>
          </span>
        </div>
      </Section>

      <Section title="Card + Form">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
            <CardDescription>2 items</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span>GH₵ 279.37</span>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="discount">Discount Code</Label>
              <div className="flex gap-2">
                <Input id="discount" defaultValue="PGEASTERT" invalid />
                <Button variant="outline">Apply</Button>
              </div>
              <FieldError>Invalid discount code</FieldError>
            </div>
            <Button variant="primary" fullWidth>
              Pay GH₵ 279.37
            </Button>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
