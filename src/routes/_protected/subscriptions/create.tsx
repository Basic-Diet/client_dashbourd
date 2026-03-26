import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/subscriptions/create")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_protected/subscriptions/create"!</div>;
}
