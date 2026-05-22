"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

/**
 * Discount code entry. Local-only validation for now.
 * TODO(medusa): apply against Medusa promotions API and reflect server result.
 */
export function DiscountField({ defaultValue = "" }: { defaultValue?: string }) {
  const [code, setCode] = React.useState(defaultValue);
  const [error, setError] = React.useState<string | null>(
    defaultValue ? "Invalid discount code" : null,
  );

  function apply() {
    if (!code.trim()) {
      setError("Enter a discount code");
      return;
    }
    // Placeholder: real validation happens server-side via Medusa.
    setError("Invalid discount code");
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="discount-code">Discount Code</Label>
      <div className="flex gap-2">
        <Input
          id="discount-code"
          value={code}
          invalid={!!error}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Enter code"
        />
        <Button variant="outline" onClick={apply}>
          Apply
        </Button>
      </div>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
