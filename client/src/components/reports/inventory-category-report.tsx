import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

type TimePeriod = "day" | "week" | "month" | "year";

export default function InventoryCategoryReport() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("month");

  const { data: inventoryByCategory, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard/inventory-by-category', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/inventory-by-category?period=${selectedPeriod}`);
      if (!response.ok) {
        throw new Error('Failed to fetch inventory by category');
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
      case 'day': return 'Last 24 Hours Activity';
      case 'week': return 'Last 7 Days Activity';
      case 'month': return 'Last 30 Days Activity';
      case 'year': return 'Last 365 Days Activity';
      default: return 'Last 30 Days Activity';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package size={20} />
          <span>Inventory by Category</span>
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
                <div>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Failed to load inventory data</p>
          </div>
        ) : inventoryByCategory && inventoryByCategory.length > 0 ? (
          <div className="space-y-4">
            {inventoryByCategory.map((category: any) => (
              <div key={category.category} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-primary-custom capitalize">
                    {category.category}
                  </p>
                  <p className="text-sm text-secondary-custom">
                    {category.productCount} products • {category.slabCount} slabs • {category.totalSquareFeet} sq ft
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary-custom">
                    {formatCurrency(category.totalValue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No inventory data available for {getPeriodLabel(selectedPeriod).toLowerCase()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}