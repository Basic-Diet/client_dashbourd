import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { mapManualDeductionError } from "./manualDeductionModel";

const searchSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(8, "الرجاء إدخال رقم هاتف صحيح لا يقل عن 8 أرقام"),
});

type SearchFormValues = z.infer<typeof searchSchema>;

interface CustomerSearchProps {
  onSearch: (phone: string) => Promise<void> | void;
  isSearching: boolean;
  error: unknown;
  disabled?: boolean;
}

export const CustomerSearch: React.FC<CustomerSearchProps> = ({
  onSearch,
  isSearching,
  error,
  disabled = false,
}) => {
  const searchForm = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { phone: "" },
  });

  const onSubmit = async (values: SearchFormValues) => {
    await onSearch(values.phone.trim());
  };

  const isBusy = isSearching || disabled || searchForm.formState.isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5" />
          البحث برقم الهاتف
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...searchForm}>
          <form
            onSubmit={searchForm.handleSubmit(onSubmit)}
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
            aria-busy={isBusy}
          >
            <FormField
              control={searchForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الهاتف</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="tel"
                      placeholder="05xxxxxxxx"
                      {...field}
                      disabled={isBusy}
                      dir="ltr"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isBusy} className="mt-0 sm:mt-8">
              {isSearching ? "جاري البحث..." : "بحث"}
            </Button>
          </form>
        </Form>

        {!!error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {mapManualDeductionError(
                error,
                "تعذر البحث عن العميل. حاول مرة أخرى."
              ).message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
