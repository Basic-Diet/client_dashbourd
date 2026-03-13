import { Outlet, createRootRouteWithContext } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { QueryClient } from "@tanstack/react-query"

export interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <TooltipProvider>
      <Outlet />
      <Toaster />
      <TanStackRouterDevtools position="bottom-left" />
    </TooltipProvider>
  )
}
