import { BoxIcon } from "@/components/ui/box";
import { CalendarCheckIcon } from "@/components/ui/calendar-check";
import { SmilePlusIcon } from "@/components/ui/smile-plus";
import { UsersIcon } from "@/components/ui/users";
import type { SectionCardsData } from "@/types/sectionCardsTypes";
import type { PackageSummary } from "@/types/packageTypes";
import { BoxesIcon } from "@/components/ui/boxes";
import { CalendarCogIcon } from "@/components/ui/calendar-cog";
import { CalendarDaysIcon } from "@/components/ui/calendar-days";

const dashboardSectionCards: SectionCardsData[] = [
  {
    id: 1,
    description: "إجمالي الاشتراكات النشطة",
    value: "1,250.00",
    percentage: "+12.5%",
    isPositive: true,
    trendText: "اتجاه تصاعدي هذا الشهر",
    icon: (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600 shadow-sm dark:bg-purple-950 dark:text-purple-400">
        <SmilePlusIcon size={26} />
      </div>
    ),
  },
  {
    id: 2,
    description: "الطلبات اليوم",
    value: "245",
    percentage: "+8.2%",
    isPositive: true,
    trendText: "زيادة في الطلبات",
    icon: (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600 shadow-sm dark:bg-amber-950 dark:text-amber-400">
        <BoxIcon size={26} />
      </div>
    ),
  },
  {
    id: 3,
    description: "عدد الخطط",
    value: "1,892",
    percentage: "-3.1%",
    isPositive: false,
    trendText: "انخفاض طفيف",
    icon: (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 text-sky-600 shadow-sm dark:bg-sky-950 dark:text-sky-400">
        <CalendarCheckIcon size={26} />
      </div>
    ),
  },
  {
    id: 4,
    description: "إجمالي مستخدمي التطبيق",
    value: "87",
    percentage: "+22.4%",
    isPositive: true,
    trendText: "نمو قوي",
    icon: (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 shadow-sm dark:bg-emerald-950 dark:text-emerald-400">
        <UsersIcon size={26} />
      </div>
    ),
  },
];

const getPackagesSectionCards = (
  summary?: PackageSummary
): SectionCardsData[] => [
  {
    id: 1,
    description: "إجمالي الباقات",
    value: summary?.totalPlans?.toString() || "0",
    icon: (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600 shadow-sm dark:bg-purple-950 dark:text-purple-400">
        <BoxesIcon size={26} />
      </div>
    ),
  },
  {
    id: 2,
    description: "الباقات النشطة",
    value: summary?.activePlans?.toString() || "0",
    isPositive: true,
    icon: (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 shadow-sm dark:bg-emerald-950 dark:text-emerald-400">
        <CalendarCheckIcon size={26} />
      </div>
    ),
  },
  {
    id: 3,
    description: "الباقات المعطلة",
    value: summary?.inactivePlans?.toString() || "0",
    isPositive: false,
    icon: (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600 shadow-sm dark:bg-amber-950 dark:text-amber-400">
        <CalendarCogIcon size={26} />
      </div>
    ),
  },
  {
    id: 4,
    description: "متوسط عدد الأيام",
    value: summary?.averageDaysCount?.toString() || "0",
    icon: (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 text-sky-600 shadow-sm dark:bg-sky-950 dark:text-sky-400">
        <CalendarDaysIcon size={26} />
      </div>
    ),
  },
];

export { dashboardSectionCards, getPackagesSectionCards };
