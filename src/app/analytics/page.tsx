import { AppLayout, Header } from "@/components/layout";
import { AnalyticsDashboard } from "./AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <AppLayout>
      <Header
        title="Insight Horizon"
        subtitle="Intelligent analytics for the TraveX guest experience"
      />
      <div className="p-8">
        <AnalyticsDashboard />
      </div>
    </AppLayout>
  );
}
