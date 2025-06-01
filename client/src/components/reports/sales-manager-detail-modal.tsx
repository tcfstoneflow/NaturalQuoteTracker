import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, FileText, TrendingUp, User, X } from "lucide-react";

interface SalesManager {
  managerId: number;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  totalRevenue: number;
  totalQuotes: number;
  conversionRate: number;
  clientsManaged: number;
}

interface SalesManagerDetailModalProps {
  manager: SalesManager | null;
  isOpen: boolean;
  onClose: () => void;
}

type TimePeriod = "day" | "week" | "month" | "year";

interface PerformanceData {
  date: string;
  revenue: number;
  quotes: number;
  conversionRate: number;
}

export default function SalesManagerDetailModal({ manager, isOpen, onClose }: SalesManagerDetailModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("month");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<string | null>(null);

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['/api/dashboard/sales-manager-performance-detail', manager?.managerId, selectedPeriod],
    queryFn: async () => {
      if (!manager) return null;
      const response = await fetch(`/api/dashboard/sales-manager-performance-detail/${manager.managerId}?period=${selectedPeriod}`);
      if (!response.ok) {
        throw new Error('Failed to fetch detailed performance data');
      }
      return response.json();
    },
    enabled: !!manager && isOpen
  });

  // Query for fetching quotes for a specific date
  const { data: quotesForDate, isLoading: isLoadingQuotes } = useQuery({
    queryKey: ['/api/dashboard/sales-manager-quotes', manager?.managerId, selectedDate],
    queryFn: async () => {
      if (!manager || !selectedDate) return null;
      const response = await fetch(`/api/dashboard/sales-manager-quotes/${manager.managerId}?date=${selectedDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch quotes for date');
      }
      return response.json();
    },
    enabled: !!manager && !!selectedDate && isOpen
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (rate: number | string) => {
    const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
    return `${numRate.toFixed(1)}%`;
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

  const formatXAxisDate = (value: string) => {
    const date = new Date(value);
    if (selectedPeriod === 'day') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (selectedPeriod === 'week' || selectedPeriod === 'month') return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return date.toLocaleDateString([], { year: 'numeric', month: 'short' });
  };

  const formatTooltipDate = (value: string) => {
    return new Date(value).toLocaleDateString();
  };

  const handleChartClick = (data: any, chartType: string) => {
    if (data && data.activeLabel) {
      setSelectedDate(data.activeLabel);
      setSelectedChartType(chartType);
    }
  };

  if (!manager) return null;

  // Calculate dynamic totals from performance data
  const calculateTotals = () => {
    if (!performanceData || performanceData.length === 0) {
      return {
        totalRevenue: manager.totalRevenue,
        totalQuotes: manager.totalQuotes,
        avgConversionRate: manager.conversionRate
      };
    }

    const totalRevenue = performanceData.reduce((sum, item) => {
      const revenue = typeof item.revenue === 'string' ? parseFloat(item.revenue) : item.revenue;
      return sum + (revenue || 0);
    }, 0);
    
    const totalQuotes = performanceData.reduce((sum, item) => {
      const quotes = typeof item.quotes === 'string' ? parseInt(item.quotes) : item.quotes;
      return sum + (quotes || 0);
    }, 0);
    
    const avgConversionRate = performanceData.length > 0 
      ? performanceData.reduce((sum, item) => {
          const rate = typeof item.conversionRate === 'string' ? parseFloat(item.conversionRate) : item.conversionRate;
          return sum + (rate || 0);
        }, 0) / performanceData.length
      : 0;

    return { totalRevenue, totalQuotes, avgConversionRate };
  };

  const { totalRevenue, totalQuotes, avgConversionRate } = calculateTotals();

  if (!manager) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User className="h-6 w-6" />
            Sales Manager Performance
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Manager Info Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {manager.avatarUrl ? (
                    <img
                      src={manager.avatarUrl}
                      alt={`${manager.firstName} ${manager.lastName}`}
                      className="w-16 h-16 rounded-full object-cover border-4 border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-lg">
                      {getInitials(manager.firstName, manager.lastName)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold">{manager.firstName} {manager.lastName}</h2>
                  <p className="text-gray-600">{manager.clientsManaged} clients managed</p>
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
                      <FileText className="h-4 w-4" />
                      <span className="text-2xl font-bold">{totalQuotes}</span>
                    </div>
                    <p className="text-sm text-gray-600">Quotes</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-2xl font-bold">{formatPercentage(avgConversionRate)}</span>
                    </div>
                    <p className="text-sm text-gray-600">Conv.</p>
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
              <p className="text-sm text-gray-600">{getPeriodLabel(selectedPeriod)}</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : performanceData && performanceData.length > 0 ? (
                <div className="space-y-6">
                  {/* Revenue Chart */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Revenue Over Time
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart 
                        data={performanceData}
                        onClick={(data) => handleChartClick(data, 'revenue')}
                        style={{ cursor: 'pointer' }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          fontSize={12}
                          tickFormatter={formatXAxisDate}
                        />
                        <YAxis 
                          fontSize={12}
                          tickFormatter={(value) => formatCurrency(value)}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                          labelFormatter={formatTooltipDate}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Quotes Chart */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Quotes Generated Over Time
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart 
                        data={performanceData}
                        onClick={(data) => handleChartClick(data, 'quotes')}
                        style={{ cursor: 'pointer' }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          fontSize={12}
                          tickFormatter={formatXAxisDate}
                        />
                        <YAxis fontSize={12} />
                        <Tooltip 
                          formatter={(value: number) => [value, 'Quotes']}
                          labelFormatter={formatTooltipDate}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="quotes" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Conversion Rate Chart */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      Conversion Rate Over Time
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart 
                        data={performanceData}
                        onClick={(data) => handleChartClick(data, 'conversion')}
                        style={{ cursor: 'pointer' }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          fontSize={12}
                          tickFormatter={formatXAxisDate}
                        />
                        <YAxis 
                          fontSize={12}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Conversion Rate']}
                          labelFormatter={formatTooltipDate}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="conversionRate" 
                          stroke="#8b5cf6" 
                          strokeWidth={3}
                          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Quotes Display Section */}
                  {selectedDate && selectedChartType && (
                    <div className="mt-8 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          Quotes for {formatTooltipDate(selectedDate)}
                          {selectedChartType && (
                            <span className="text-sm text-gray-500 ml-2">
                              (from {selectedChartType} chart)
                            </span>
                          )}
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDate(null);
                            setSelectedChartType(null);
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      </div>

                      {isLoadingQuotes ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                          ))}
                        </div>
                      ) : quotesForDate && quotesForDate.length > 0 ? (
                        <div className="space-y-3">
                          {quotesForDate.map((quote: any) => (
                            <div
                              key={quote.id}
                              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer hover:border-blue-300"
                              onClick={() => window.open(`/quotes?highlight=${quote.id}`, '_blank')}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-blue-600">
                                    #{quote.quoteNumber}
                                  </span>
                                  <Badge
                                    variant={
                                      quote.status === 'approved' ? 'default' :
                                      quote.status === 'pending' ? 'secondary' :
                                      quote.status === 'rejected' ? 'destructive' : 'outline'
                                    }
                                  >
                                    {quote.status}
                                  </Badge>
                                </div>
                                <span className="font-semibold text-green-600">
                                  {formatCurrency(quote.total)}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                <div className="flex items-center gap-4">
                                  <span>
                                    <strong>Client:</strong> {quote.client.name}
                                  </span>
                                  <span>
                                    <strong>Email:</strong> {quote.client.email}
                                  </span>
                                  <span>
                                    <strong>Date:</strong> {new Date(quote.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No quotes found for this date</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No performance data available for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}