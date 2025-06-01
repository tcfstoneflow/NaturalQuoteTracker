import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TrendingUp, DollarSign, Package, BarChart3 } from "lucide-react";
import ProductDetailModal from "./product-detail-modal";

type TimePeriod = "day" | "week" | "month" | "year";

export default function TopSellingProductsReport() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("month");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: topProducts, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard/top-selling-products', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/top-selling-products?period=${selectedPeriod}`);
      if (!response.ok) {
        throw new Error('Failed to fetch top selling products');
      }
      return response.json();
    }
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

  const handleProductClick = (product: any) => {
    // Transform the product data to match the ProductDetailModal interface
    const transformedProduct = {
      productId: product.productId,
      productName: product.productName,
      category: product.category,
      supplier: product.supplier || 'Unknown',
      imageUrl: product.imageUrl,
      totalSales: Math.round(product.totalQuantitySold || 0),
      totalRevenue: product.totalRevenue,
      stockQuantity: product.stockQuantity || 0,
      averageOrderSize: product.numberOfSales || 0
    };
    setSelectedProduct(transformedProduct);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Top Selling Products
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
                <Skeleton className="h-12 w-12 rounded-lg" />
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
            <p className="text-red-600 text-sm">Failed to load top selling products</p>
          </div>
        )}

        {/* Products List */}
        {!isLoading && !error && (
          <div className="space-y-3">
            {topProducts && topProducts.length > 0 ? (
              topProducts.map((product: any, index: number) => (
                <div 
                  key={product.productId} 
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleProductClick(product)}
                >
                  {/* Rank Badge */}
                  <Badge 
                    variant={index === 0 ? "default" : "secondary"}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                  >
                    {index + 1}
                  </Badge>

                  {/* Product Image */}
                  <img 
                    src={product.imageUrl || getProductImage(product.category)}
                    alt={product.productName}
                    className="w-12 h-12 rounded-lg object-cover"
                  />

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate text-sm">
                      {product.productName}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {product.bundleId} • {product.category}
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="flex gap-4 text-right">
                    <div>
                      <div className="flex items-center gap-1 text-green-600">
                        <DollarSign className="h-3 w-3" />
                        <span className="font-semibold text-xs">
                          {formatCurrency(product.totalRevenue)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Revenue</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-1 text-blue-600">
                        <Package className="h-3 w-3" />
                        <span className="font-semibold text-xs">
                          {Math.round(product.totalQuantitySold)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Qty</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-1 text-purple-600">
                        <BarChart3 className="h-3 w-3" />
                        <span className="font-semibold text-xs">
                          {product.numberOfSales}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Orders</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No sales data available for {getPeriodLabel(selectedPeriod).toLowerCase()}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
    </Card>
  );
}