import { SearchIcon } from "lucide-react";

import {
  LayoutDashboardIcon,
  Settings2Icon,
  CircleHelpIcon,
} from "lucide-react";

export const NavLinksData = {
  navMain: [
    {
      title: "لوحة التحكم",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "الباقات",
      url: "/packages",
      icon: <LayoutDashboardIcon />,
    },
  ],
  navSecondary: [
    {
      title: "الإعدادات",
      url: "#",
      icon: <Settings2Icon />,
    },
    {
      title: "المساعدة",
      url: "#",
      icon: <CircleHelpIcon />,
    },
    {
      title: "البحث",
      url: "#",
      icon: <SearchIcon />,
    },
  ],
};
