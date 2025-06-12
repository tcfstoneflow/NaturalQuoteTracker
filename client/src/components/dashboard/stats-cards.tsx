import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardApi } from "@/lib/api";
import { DollarSign, Users, FileText, Package, TrendingUp, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: dashboardApi.getStats,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Total Revenue",
      value: `$${parseFloat(stats.totalRevenue || '0').toLocaleString()}`,
      change: stats.revenueChange || '0%',
      changeType: "positive" as const,
      icon: DollarSign,
      bgColor: "bg-green-100",
      iconColor: "text-success-green",
    },
    {
      title: "Active Clients",
      value: (stats.activeClients || 0).toLocaleString(),
      change: stats.clientsChange || '0%',
      changeType: "positive" as const,
      icon: Users,
      bgColor: "bg-blue-100",
      iconColor: "text-primary",
    },
    {
      title: "Pending Quotes",
      value: (stats.pendingQuotes || 0).toString(),
      change: `${stats.expiringQuotesCount || 0} expiring soon`,
      changeType: "warning" as const,
      icon: FileText,
      bgColor: "bg-orange-100",
      iconColor: "text-warning-orange",
    },
    {
      title: "Inventory Items",
      value: (stats.inventoryItems || 0).toString(),
      change: `${stats.lowStockCount || 0} low stock`,
      changeType: stats.lowStockCount > 0 ? "negative" : "neutral",
      icon: Package,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        
        return (
          <Card key={index} className="border border-neutral-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-custom text-sm font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-primary-custom">{stat.value}</p>
                  <p className={`text-sm font-medium mt-1 flex items-center ${
                    stat.changeType === 'positive' ? 'text-success-green' :
                    stat.changeType === 'warning' ? 'text-warning-orange' :
                    stat.changeType === 'negative' ? 'text-error-red' :
                    'text-secondary-custom'
                  }`}>
                    {stat.changeType === 'positive' && <TrendingUp size={12} className="mr-1" />}
                    {stat.changeType === 'warning' && <AlertTriangle size={12} className="mr-1" />}
                    {stat.changeType === 'negative' && <AlertTriangle size={12} className="mr-1" />}
                    {stat.change}
                  </p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={stat.iconColor} size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
