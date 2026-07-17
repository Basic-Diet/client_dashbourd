import { CreateSubscriptionFormContent } from "@/components/pages/subscriptions/create/CreateSubscriptionFormContent";

export function CreateSubscriptionForm({ userId }: { userId: string }) {
  return <CreateSubscriptionFormContent userId={userId} />;
}
