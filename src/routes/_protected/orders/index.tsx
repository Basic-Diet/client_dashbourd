import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/orders/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_protected/orders/"!</div>;
}
