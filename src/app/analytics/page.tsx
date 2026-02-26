import { AppLayout, Header } from "@/components/layout";
import { AnalyticsSection } from "../dashboard/AnalyticsSection";

export default async function AnalyticsPage() {
  return (
    <AppLayout>
      <Header
        title="Analytics"
        subtitle="Customer feedback & insights"
      />
      <AnalyticsSection />
    </AppLayout>
  );
}
