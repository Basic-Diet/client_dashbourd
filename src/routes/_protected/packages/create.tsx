import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/packages/create')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_protected/packages/create"!</div>
}
