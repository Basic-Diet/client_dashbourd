import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RouteError } from "@/components/global/RouteError";
import { Loader } from "@/components/global/loader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import type { AuthResponse } from "@/types/auth";
import { sessionQueryOptions } from "@/lib/authApi";
import { authMiddleware } from "@/lib/authMiddleware";

export const Route = createFileRoute("/_protected")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const data = await context.queryClient.ensureQueryData(sessionQueryOptions);
    authMiddleware(
      data as AuthResponse,
      location.pathname,
      location.search as Record<string, string>
    );
  },
  pendingComponent: Loader,
  errorComponent: RouteError,
});

function RouteComponent() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" side="right" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <Outlet />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
