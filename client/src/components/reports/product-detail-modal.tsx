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
import { Button } from "@/components/ui/button";
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
  FileText,
  User,
  Clock,
  X,
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);

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

  const { data: quotesForDate, isLoading: isLoadingQuotes } = useQuery({
    queryKey: ['/api/dashboard/product-quotes', product?.productId, selectedDate],
    queryFn: async () => {
      if (!product || !selectedDate) return null;
      const response = await fetch(`/api/dashboard/product-quotes/${product.productId}?date=${selectedDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch quotes for selected date');
      }
      return response.json();
    },
    enabled: !!product && !!selectedDate && isOpen
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

  const formatXAxisDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (selectedPeriod === "day") {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (selectedPeriod === "week" || selectedPeriod === "month") {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } else if (selectedPeriod === "year") {
      return date.toLocaleDateString('en-US', { 
        month: 'short',
        year: 'numeric'
      });
    }
    return dateStr;
  };

  const handleChartClick = (data: any, chartType: string) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clickedDate = data.activePayload[0].payload.date;
      setSelectedDate(clickedDate);
      setSelectedChartType(chartType);
    }
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
                    <LineChart data={performanceData || []} onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tickFormatter={formatXAxisDate}
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
                    <LineChart data={performanceData || []} onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tickFormatter={formatXAxisDate}
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
                    <LineChart data={performanceData || []} onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tickFormatter={formatXAxisDate}
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

              {selectedDate && (
                <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Quotes for {new Date(selectedDate).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                      <button
                        onClick={() => setSelectedDate(null)}
                        className="ml-auto text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingQuotes ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : quotesForDate && quotesForDate.length > 0 ? (
                      <div className="space-y-4">
                        {quotesForDate.map((quote: any) => (
                          <div
                            key={quote.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => setSelectedQuote(quote)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  Quote #{quote.quoteNumber}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  Client: {quote.client?.name || 'Unknown'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Status: <span className="capitalize">{quote.status}</span>
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-lg">
                                  {formatCurrency(quote.total || 0)}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Created: {new Date(quote.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {quote.lineItems && quote.lineItems.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-sm font-medium text-gray-700 mb-2">Items:</p>
                                <div className="space-y-1">
                                  {quote.lineItems.map((item: any, index: number) => (
                                    <div key={index} className="flex justify-between text-sm text-gray-600">
                                      <span>{item.product?.name || 'Unknown Product'} (Qty: {item.quantity})</span>
                                      <span>{formatCurrency(parseFloat(item.totalPrice || '0'))}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No quotes found for this date
                      </div>
                    )}
                  </CardContent>
                </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>

      {/* Quote Detail Modal */}
      {selectedQuote && (
        <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Quote #{selectedQuote.quoteNumber}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Quote Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p><strong>Name:</strong> {selectedQuote.client?.name || 'Unknown'}</p>
                    <p><strong>Email:</strong> {selectedQuote.client?.email || 'N/A'}</p>
                    <p><strong>Status:</strong> <span className="capitalize">{selectedQuote.status}</span></p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quote Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p><strong>Created:</strong> {new Date(selectedQuote.createdAt).toLocaleDateString()}</p>
                    <p><strong>Valid Until:</strong> {selectedQuote.validUntil ? new Date(selectedQuote.validUntil).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Total Amount:</strong> <span className="text-xl font-bold text-green-600">{formatCurrency(selectedQuote.total || 0)}</span></p>
                  </CardContent>
                </Card>
              </div>

              {/* Line Items */}
              {selectedQuote.lineItems && selectedQuote.lineItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Quote Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3">Product</th>
                            <th className="text-center p-3">Quantity</th>
                            <th className="text-right p-3">Unit Price</th>
                            <th className="text-right p-3">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedQuote.lineItems.map((item: any, index: number) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="p-3">{item.product?.name || 'Unknown Product'}</td>
                              <td className="text-center p-3">{item.quantity}</td>
                              <td className="text-right p-3">{formatCurrency(parseFloat(item.unitPrice || '0'))}</td>
                              <td className="text-right p-3 font-medium">{formatCurrency(parseFloat(item.totalPrice || '0'))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedQuote(null)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    window.open(`/quotes?highlight=${selectedQuote.id}`, '_blank');
                  }}
                >
                  View Full Quote
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}