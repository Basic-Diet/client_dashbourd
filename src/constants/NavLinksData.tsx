import {
  LayoutDashboardIcon,
  Settings2Icon,
  CircleHelpIcon,
  Users,
  Boxes,
  CalendarPlus,
  // Truck,
  UtensilsCrossed,
  PlusSquare,
  Utensils,
  FolderOpen,
} from "lucide-react";

export const NavLinksData = {
  navMain: [
    {
      title: "لوحة التحكم",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "الوجبات",
      url: "/meals",
      icon: <Utensils />,
    },
    {
      title: "تصنيفات الوجبات",
      url: "/categories",
      icon: <FolderOpen />,
    },
    {
      title: "الوجبات المميزة",
      url: "/premium-meals",
      icon: <UtensilsCrossed />,
    },
    {
      title: "الإضافات",
      url: "/addons",
      icon: <PlusSquare />,
    },
    {
      title: "الباقات",
      url: "/packages",
      icon: <Boxes />,
    },
    {
      title: "الاشتراكات",
      url: "/subscriptions",
      icon: <CalendarPlus />,
    },
    // {
    //   title: "الطلبات",
    //   url: "/orders",
    //   icon: <Truck />,
    // },
    {
      title: "المستخدمين",
      url: "/users",
      icon: <Users />,
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
  ],
};
