import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TrendingUp, DollarSign, Package, BarChart3 } from "lucide-react";

interface TopProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TimePeriod = "day" | "week" | "month" | "year";

export default function TopProductsModal({ open, onOpenChange }: TopProductsModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("month");

  const { data: topProducts, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard/top-selling-products', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/top-selling-products?period=${selectedPeriod}`);
      if (!response.ok) {
        throw new Error('Failed to fetch top selling products');
      }
      return response.json();
    },
    enabled: open
  });

  const getProductImage = (category: string) => {
    const images = {
      marble: "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=100&h=100&fit=crop",
      granite: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100&h=100&fit=crop",
      travertine: "https://images.unsplash.com/photo-1615971677499-5467cbab01dc?w=100&h=100&fit=crop",
      quartz: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop",
    };
    return images[category as keyof typeof images] || images.marble;
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Top 5 Selling Products
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Time Period Toggle */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Time Period</label>
            <ToggleGroup 
              type="single" 
              value={selectedPeriod} 
              onValueChange={(value) => value && setSelectedPeriod(value as TimePeriod)}
              className="justify-start"
            >
              <ToggleGroupItem value="day" aria-label="Last 24 Hours">
                Day
              </ToggleGroupItem>
              <ToggleGroupItem value="week" aria-label="Last 7 Days">
                Week
              </ToggleGroupItem>
              <ToggleGroupItem value="month" aria-label="Last 30 Days">
                Month
              </ToggleGroupItem>
              <ToggleGroupItem value="year" aria-label="Last 12 Months">
                Year
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-gray-500">
              Showing data for: {getPeriodLabel(selectedPeriod)}
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-16 w-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">Failed to load top selling products</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Products List */}
          {!isLoading && !error && (
            <div className="space-y-4">
              {topProducts && topProducts.length > 0 ? (
                topProducts.map((product: any, index: number) => (
                  <div 
                    key={product.productId} 
                    className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Rank Badge */}
                    <div className="flex-shrink-0">
                      <Badge 
                        variant={index === 0 ? "default" : "secondary"}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                      >
                        {index + 1}
                      </Badge>
                    </div>

                    {/* Product Image */}
                    <img 
                      src={product.imageUrl || getProductImage(product.category)}
                      alt={product.productName}
                      className="w-16 h-16 rounded-lg object-cover"
                    />

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {product.productName}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Bundle: {product.bundleId} • {product.category}
                      </p>
                    </div>

                    {/* Metrics */}
                    <div className="flex gap-6 text-right">
                      <div>
                        <div className="flex items-center gap-1 text-green-600">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-semibold">
                            {formatCurrency(product.totalRevenue)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Revenue</p>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1 text-blue-600">
                          <Package className="h-4 w-4" />
                          <span className="font-semibold">
                            {Math.round(product.totalQuantitySold)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Qty Sold</p>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1 text-purple-600">
                          <BarChart3 className="h-4 w-4" />
                          <span className="font-semibold">
                            {product.numberOfSales}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Orders</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No sales data available for {getPeriodLabel(selectedPeriod).toLowerCase()}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}