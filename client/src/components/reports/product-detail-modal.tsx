import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Package,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  BarChart3,
} from "lucide-react";

interface Product {
  productId: number;
  productName: string;
  category: string;
  supplier: string;
  imageUrl?: string;
  totalSales: number;
  totalRevenue: number;
  stockQuantity: number;
  averageOrderSize: number;
}

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

type TimePeriod = "day" | "week" | "month" | "year";

interface ProductPerformanceData {
  date: string;
  sales: number;
  revenue: number;
  stockLevel: number;
  orderCount: number;
}

export default function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("month");

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['/api/dashboard/product-performance-detail', product?.productId, selectedPeriod],
    queryFn: async () => {
      if (!product) return null;
      const response = await fetch(`/api/dashboard/product-performance-detail/${product.productId}?period=${selectedPeriod}`);
      if (!response.ok) {
        throw new Error('Failed to fetch detailed product performance data');
      }
      return response.json();
    },
    enabled: !!product && isOpen
  });

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
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

  if (!product) return null;

  // Calculate dynamic totals from performance data
  const calculateTotals = () => {
    if (!performanceData || performanceData.length === 0) {
      return {
        totalSales: product.totalSales,
        totalRevenue: product.totalRevenue,
        avgOrderCount: product.averageOrderSize
      };
    }

    const totalSales = performanceData.reduce((sum: number, item: any) => {
      const sales = typeof item.sales === 'string' ? parseInt(item.sales) : item.sales;
      return sum + (sales || 0);
    }, 0);
    
    const totalRevenue = performanceData.reduce((sum: number, item: any) => {
      const revenue = typeof item.revenue === 'string' ? parseFloat(item.revenue) : item.revenue;
      return sum + (revenue || 0);
    }, 0);
    
    const avgOrderCount = performanceData.length > 0 
      ? performanceData.reduce((sum: number, item: any) => {
          const orders = typeof item.orderCount === 'string' ? parseInt(item.orderCount) : item.orderCount;
          return sum + (orders || 0);
        }, 0) / performanceData.length
      : 0;

    return { totalSales, totalRevenue, avgOrderCount };
  };

  const { totalSales, totalRevenue, avgOrderCount } = calculateTotals();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Package className="h-6 w-6" />
            Product Performance
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Info Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.productName}
                      className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-orange-500 flex items-center justify-center text-white font-semibold text-lg">
                      <Package className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold">{product.productName}</h2>
                  <p className="text-gray-600">{product.category} • {product.supplier}</p>
                  <p className="text-sm text-gray-500">Stock: {product.stockQuantity} units</p>
                </div>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-2xl font-bold">{formatCurrency(totalRevenue)}</span>
                    </div>
                    <p className="text-sm text-gray-600">Revenue</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                      <ShoppingCart className="h-4 w-4" />
                      <span className="text-2xl font-bold">{totalSales}</span>
                    </div>
                    <p className="text-sm text-gray-600">Units Sold</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                      <BarChart3 className="h-4 w-4" />
                      <span className="text-2xl font-bold">{Math.round(avgOrderCount)}</span>
                    </div>
                    <p className="text-sm text-gray-600">Avg Orders</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Period Selector */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Performance Over Time</CardTitle>
                <ToggleGroup type="single" value={selectedPeriod} onValueChange={(value) => value && setSelectedPeriod(value as TimePeriod)}>
                  <ToggleGroupItem value="day" aria-label="Day">Day</ToggleGroupItem>
                  <ToggleGroupItem value="week" aria-label="Week">Week</ToggleGroupItem>
                  <ToggleGroupItem value="month" aria-label="Month">Month</ToggleGroupItem>
                  <ToggleGroupItem value="year" aria-label="Year">Year</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <p className="text-sm text-muted-foreground">
                {getPeriodLabel(selectedPeriod)}
              </p>
            </CardHeader>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid gap-6">
              {/* Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Revenue Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Sales Volume Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                    Units Sold Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value) => [value, 'Units Sold']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Stock Level Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-600" />
                    Stock Level Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value) => [value, 'Stock Level']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="stockLevel" 
                        stroke="#f97316" 
                        strokeWidth={2}
                        dot={{ fill: '#f97316', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}