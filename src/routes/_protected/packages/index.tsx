import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/packages/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <h1>Hello "/_protected/packages/"!</h1>
    </>
  );
}
