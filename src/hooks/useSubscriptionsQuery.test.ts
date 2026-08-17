import { describe, expect, it } from "vitest";
import { subscriptionDetailsQueryOptions } from "@/hooks/useSubscriptionsQuery";

describe("subscription details query options", () => {
  it("does not request the subscriptions collection when no subscription is selected", () => {
    expect(subscriptionDetailsQueryOptions("").enabled).toBe(false);
  });

  it("enables the details request for a real subscription id", () => {
    expect(subscriptionDetailsQueryOptions("6a6b48aee3114fa289e4ad93").enabled).toBe(true);
  });
});
