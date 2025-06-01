import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Users, DollarSign, FileText, TrendingUp } from "lucide-react";

type TimePeriod = "day" | "week" | "month" | "year";

export default function SalesManagerPerformanceReport() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("month");

  const { data: salesManagers, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard/sales-manager-performance', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/sales-manager-performance?period=${selectedPeriod}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sales manager performance');
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
    const labels = {
      day: "Last 24 Hours",
      week: "Last 7 Days", 
      month: "Last 30 Days",
      year: "Last 12 Months"
    };
    return labels[period];
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-green-600" />
          Sales Manager Performance
        </CardTitle>
        
        {/* Time Period Toggle */}
        <div className="flex flex-col gap-2">
          <ToggleGroup 
            type="single" 
            value={selectedPeriod} 
            onValueChange={(value) => value && setSelectedPeriod(value as TimePeriod)}
            className="justify-start"
          >
            <ToggleGroupItem value="day" aria-label="Last 24 Hours" size="sm">
              Day
            </ToggleGroupItem>
            <ToggleGroupItem value="week" aria-label="Last 7 Days" size="sm">
              Week
            </ToggleGroupItem>
            <ToggleGroupItem value="month" aria-label="Last 30 Days" size="sm">
              Month
            </ToggleGroupItem>
            <ToggleGroupItem value="year" aria-label="Last 12 Months" size="sm">
              Year
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-xs text-gray-500">
            {getPeriodLabel(selectedPeriod)}
          </p>
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-6">
            <p className="text-red-600 text-sm">Failed to load sales manager performance</p>
          </div>
        )}

        {/* Sales Managers List */}
        {!isLoading && !error && (
          <div className="space-y-3">
            {salesManagers && salesManagers.length > 0 ? (
              salesManagers.map((manager: any, index: number) => (
                <div 
                  key={manager.managerId} 
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {/* Rank Badge */}
                  <Badge 
                    variant={index === 0 ? "default" : "secondary"}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                  >
                    {index + 1}
                  </Badge>

                  {/* Manager Avatar */}
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                    {getInitials(manager.firstName, manager.lastName)}
                  </div>

                  {/* Manager Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate text-sm">
                      {manager.firstName} {manager.lastName}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {manager.clientCount} clients managed
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="flex gap-4 text-right">
                    <div>
                      <div className="flex items-center gap-1 text-green-600">
                        <DollarSign className="h-3 w-3" />
                        <span className="font-semibold text-xs">
                          {formatCurrency(manager.totalRevenue)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Revenue</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-1 text-blue-600">
                        <FileText className="h-3 w-3" />
                        <span className="font-semibold text-xs">
                          {manager.quotesCreated}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Quotes</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-1 text-purple-600">
                        <TrendingUp className="h-3 w-3" />
                        <span className="font-semibold text-xs">
                          {manager.conversionRate}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Conv.</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No sales data available for {getPeriodLabel(selectedPeriod).toLowerCase()}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}