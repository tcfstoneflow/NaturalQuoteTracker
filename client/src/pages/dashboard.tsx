import StatsCards from "@/components/dashboard/stats-cards";
import RecentQuotes from "@/components/dashboard/recent-quotes";
import TopProducts from "@/components/dashboard/top-products";
import RecentActivity from "@/components/dashboard/recent-activity";
import AIQueryAssistant from "@/components/sql/ai-query-assistant";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50-custom">
        {/* Quick Access to Client Page */}
        <div className="mb-6">
          <Button 
            onClick={() => window.open('/public-inventory', '_blank')}
            className="bg-accent-orange hover:bg-accent-orange/90 text-white"
          >
            <ExternalLink size={16} className="mr-2" />
            View Client-Facing Inventory
          </Button>
        </div>

        {/* Stats Cards */}
        <StatsCards />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <RecentQuotes />
          </div>
          <div>
            <TopProducts />
          </div>
        </div>

        {/* SQL Query Tool & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AIQueryAssistant />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
