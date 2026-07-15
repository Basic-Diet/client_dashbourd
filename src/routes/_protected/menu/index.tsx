import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookOpen, CheckCircle2, FileText, Layers } from "lucide-react";

import { MenuAuditLogTab } from "@/components/pages/menu/audit/MenuAuditLogTab";
import { MenuCategoriesTab } from "@/components/pages/menu/categories/MenuCategoriesTab";
import { MealBuilderSimplePage } from "@/components/pages/menu/meal-builder/MealBuilderSimplePage";
import { MenuPublishDialog } from "@/components/pages/menu/MenuPublishDialog";
import { MenuValidationDialog } from "@/components/pages/menu/MenuValidationDialog";
import { MenuOptionGroupsTab } from "@/components/pages/menu/option-groups/MenuOptionGroupsTab";
import { MenuOptionsTab } from "@/components/pages/menu/options/MenuOptionsTab";
import { MenuProductsTab } from "@/components/pages/menu/products/MenuProductsTab";
import { PublicMenuPreviewTab } from "@/components/pages/menu/public-preview/PublicMenuPreviewTab";
import { MenuVersionsTab } from "@/components/pages/menu/versions/MenuVersionsTab";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { legacyMenuTabMap, workflowSteps } from "@/constants/menuData";

const menuTabValues = new Set(workflowSteps.map((step) => step.value));

export const Route = createFileRoute("/_protected/menu/")({
  validateSearch: (search: Record<string, unknown>) => {
    const requestedTab = typeof search.tab === "string" ? search.tab : "catalog";
    const tab = legacyMenuTabMap[requestedTab] || requestedTab;

    return {
      tab: menuTabValues.has(tab) ? tab : "catalog",
    };
  },
  component: MenuPage,
});

function MenuPage() {
  const { tab: activeTab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const setActiveTab = (value: string) => {
    navigate({ search: (prev) => ({ ...prev, tab: value }) });
  };

  return (
    <div
      className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:px-6"
      dir="rtl"
    >
      <header className="flex flex-col gap-5 rounded-lg border bg-card p-5 shadow-xs lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="size-5" />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                إدارة قائمة الطلبات
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                دورة واضحة لبناء القائمة: التصنيفات، المنتجات، مجموعات
                الخيارات، الربط، معاينة العميل، ثم التحقق والنشر.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MenuValidationDialog />
            <MenuPublishDialog />
          </div>
        </div>

        <Separator />

        <div className="grid gap-3 sm:grid-cols-3">
          <MenuHeaderMetric
            icon={CheckCircle2}
            title="جاهزة للمراجعة"
            description="تحقق من العلاقات قبل النشر"
          />
          <MenuHeaderMetric
            icon={Layers}
            title="دورة مترابطة"
            description="التصنيفات والمنتجات والخيارات في مكان واحد"
          />
          <MenuHeaderMetric
            icon={FileText}
            title="تتبع التغييرات"
            description="السجل يعرض آخر عمليات الإدارة"
          />
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <div className="overflow-x-auto pb-1">
          <TabsList className="grid min-h-max min-w-[760px] grid-cols-5 gap-2 bg-muted/70 p-2">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <TabsTrigger
                  key={step.value}
                  value={step.value}
                  className="h-full justify-start gap-2 rounded-md px-3 py-3 text-right data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background text-xs font-semibold text-muted-foreground ring-1 ring-border">
                    {index + 1}
                  </span>
                  <Icon className="hidden size-4 shrink-0 text-muted-foreground xl:block" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {step.label}
                    </span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {step.description}
                    </span>
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="catalog" className="mt-5">
          <div className="grid gap-5">
            <MenuCategoriesTab />
            <MenuProductsTab />
          </div>
        </TabsContent>
        <TabsContent value="builder" className="mt-5">
          <div className="grid gap-5">
            <MenuOptionGroupsTab />
            <MenuOptionsTab />
          </div>
        </TabsContent>
        <TabsContent value="meal-builder" className="mt-5">
          <MealBuilderSimplePage />
        </TabsContent>
        <TabsContent value="preview" className="mt-5">
          <div className="grid gap-5">
            <PublicMenuPreviewTab />
          </div>
        </TabsContent>
        <TabsContent value="release" className="mt-5">
          <div className="grid gap-5">
            <MenuVersionsTab />
            <MenuAuditLogTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MenuHeaderMetric({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CheckCircle2;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
      <Icon className="size-4 shrink-0 text-primary" />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
    </div>
  );
}
