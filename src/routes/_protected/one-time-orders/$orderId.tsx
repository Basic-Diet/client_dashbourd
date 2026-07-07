import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_protected/one-time-orders/$orderId"
)({
  beforeLoad: () => {
    throw redirect({ to: "/operations", search: { tab: "kitchen" } });
  },
  component: () => null,
});
