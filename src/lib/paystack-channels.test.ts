import { describe, expect, it } from "vitest";
import { paystackChannels } from "./paystack-channels";

describe("paystackChannels", () => {
  it("locks Paystack to the chosen method", () => {
    expect(paystackChannels("mobile_money")).toEqual(["mobile_money"]);
    expect(paystackChannels("card")).toEqual(["card"]);
  });

  it("leaves Paystack unrestricted for anything else", () => {
    expect(paystackChannels(undefined)).toBeUndefined();
    expect(paystackChannels("bank")).toBeUndefined();
    expect(paystackChannels(["card"])).toBeUndefined();
  });
});
