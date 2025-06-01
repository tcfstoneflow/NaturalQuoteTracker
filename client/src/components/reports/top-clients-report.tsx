import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

type TimePeriod = "day" | "week" | "month" | "year";

export default function TopClientsReport() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("month");

  const { data: topClients, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard/top-clients', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/top-clients?period=${selectedPeriod}`);
      if (!response.ok) {
        throw new Error('Failed to fetch top clients');
      }
      return response.json();
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPeriodLabel = (period: TimePeriod) => {
    switch (period) {
      case 'day': return 'Last 24 Hours';
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last 30 Days';
      case 'year': return 'Last 365 Days';
      default: return 'Last 30 Days';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users size={20} />
          <span>Top Clients by Revenue</span>
        </CardTitle>
        
        {/* Time Period Filters */}
        <div className="flex space-x-2 mt-4">
          {(['day', 'week', 'month', 'year'] as const).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
              className="capitalize"
            >
              {period}
            </Button>
          ))}
        </div>
        
        <p className="text-sm text-gray-500 mt-2">
          {getPeriodLabel(selectedPeriod)}
        </p>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Failed to load client data</p>
          </div>
        ) : topClients && topClients.length > 0 ? (
          <div className="space-y-4">
            {topClients.map((client: any, index: number) => (
              <div key={client.clientId} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-primary-custom">
                      {client.company || client.name}
                    </p>
                    <p className="text-sm text-secondary-custom">
                      {client.quoteCount} quote{client.quoteCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary-custom">
                    {formatCurrency(client.totalRevenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No client revenue data available for {getPeriodLabel(selectedPeriod).toLowerCase()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}