"use client";

import * as React from "react";
import { Link } from "@tanstack/react-router";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon?: React.ReactNode;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { isMobile, setOpenMobile } = useSidebar();

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.url === "#" ? (
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className="transition-colors hover:bg-primary hover:text-white"
                >
                  <a href={item.url} onClick={closeMobileSidebar}>
                    {item.icon}
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              ) : (
                <Link
                  to={item.url}
                  onClick={closeMobileSidebar}
                  activeProps={{
                    className:
                      "bg-primary block rounded-md text-background dark:text-foreground",
                  }}
                >
                  <SidebarMenuButton
                    tooltip={item.title}
                    className="transition-colors hover:bg-primary hover:text-white"
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </Link>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
