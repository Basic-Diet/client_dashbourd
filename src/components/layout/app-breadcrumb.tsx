import { useMatches, Link } from "@tanstack/react-router";
import * as React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { routeTranslations } from "@/constants/routeTranslations";
import { useQuery } from "@tanstack/react-query";
import { fetchUserDetails } from "@/utils/fetchUsersData";

// Check if a segment looks like a MongoDB ObjectId (24 hex chars)
const isObjectId = (segment: string) => /^[a-f0-9]{24}$/i.test(segment);

// Build breadcrumb items from the current pathname
// e.g. /packages/create → ["packages", "create"]
const buildCrumbs = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);

  return segments.map((segment, index) => {
    const path = "/" + segments.slice(0, index + 1).join("/");
    const label = routeTranslations[segment] ?? segment;
    const parentSegment = index > 0 ? segments[index - 1] : null;
    return { path, label, segment, parentSegment };
  });
};

// Component to resolve a user ID to a name in the breadcrumb
function UserNameCrumb({ userId, isLast, path }: { userId: string; isLast: boolean; path: string }) {
  const { data } = useQuery({
    queryKey: ["user-details", userId],
    queryFn: () => fetchUserDetails(userId),
    staleTime: 1000 * 60 * 10,
  });

  const label = data?.data?.fullName || userId.slice(-8);

  if (isLast) {
    return <BreadcrumbPage>{label}</BreadcrumbPage>;
  }

  return (
    <BreadcrumbLink asChild>
      <Link to={path}>{label}</Link>
    </BreadcrumbLink>
  );
}

export function AppBreadcrumb() {
  const matches = useMatches();

  // Get the deepest matched pathname (the current page)
  const currentPathname = matches[matches.length - 1]?.pathname ?? "/";

  const crumbs = buildCrumbs(currentPathname);

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          // Check if this segment is a dynamic user ID
          const isUserIdSegment = crumb.parentSegment === "users" && isObjectId(crumb.segment);

          return (
            <React.Fragment key={crumb.path}>
              <BreadcrumbItem>
                {isUserIdSegment ? (
                  <UserNameCrumb userId={crumb.segment} isLast={isLast} path={crumb.path} />
                ) : isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator className="rotate-180" />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

