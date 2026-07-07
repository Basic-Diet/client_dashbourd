import * as React from "react";
void React;

import {
  Bell,
  BookOpen,
  Boxes,
  CalendarPlus,
  ChartNoAxesCombined,
  ChefHat,
  CircleHelpIcon,
  Clock,
  CreditCard,
  LayoutDashboardIcon,
  MapPin,
  MinusCircle,
  PlusSquare,
  Settings2Icon,
  ShieldUser,
  Sparkles,
  Ticket,
  Truck,
  Users,
} from "lucide-react";

export const NavLinksData = {
  navMain: [
    {
      title: "لوحة التحكم",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "المدفوعات",
      url: "/payments",
      icon: <CreditCard />,
    },
    {
      title: "المحاسبة",
      url: "/accounting",
      icon: <ChartNoAxesCombined />,
    },
    {
      title: "أكواد الخصم",
      url: "/promo-codes",
      icon: <Ticket />,
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
    {
      title: "لوحة العمليات",
      url: "/operations",
      icon: <ChefHat />,
    },
    {
      title: "خصم يدوي",
      url: "/manual-deduction",
      icon: <MinusCircle />,
    },
    {
      title: "المنيو",
      url: "/menu",
      icon: <BookOpen />,
    },
    {
      title: "وجبات بريميوم",
      url: "/premium-meals",
      icon: <Sparkles />,
    },
    {
      title: "التوصيل",
      url: "/delivery",
      icon: <Truck />,
    },
    {
      title: "مناطق التوصيل",
      url: "/zones",
      icon: <MapPin />,
    },
    {
      title: "المستخدمين",
      url: "/users",
      icon: <Users />,
    },
    {
      title: "مستخدمو اللوحة",
      url: "/dashboard-users",
      icon: <ShieldUser />,
    },
  ],
  navSecondary: [
    {
      title: "الإعدادات",
      url: "/settings",
      icon: <Settings2Icon />,
    },
    {
      title: "ساعات العمل",
      url: "/restaurant-hours",
      icon: <Clock />,
    },
    {
      title: "فروع الاستلام",
      url: "/pickup-branches",
      icon: <MapPin />,
    },
    {
      title: "الإشعارات",
      url: "/notifications",
      icon: <Bell />,
    },
    {
      title: "المساعدة",
      url: "#",
      icon: <CircleHelpIcon />,
    },
  ],
};
