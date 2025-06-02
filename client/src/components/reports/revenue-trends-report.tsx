import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Calendar, BarChart3, LineChart, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, PieChart, Pie, Cell } from "recharts";

export default function RevenueTrendsReport() {
  const [timeframe, setTimeframe] = useState("monthly");
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const { toast } = useToast();
  
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ["/api/reports/revenue-trends", timeframe],
    queryFn: () => fetch(`/api/reports/revenue-trends?timeframe=${timeframe}`).then(res => res.json()),
  });

  const exportRevenueReport = () => {
    if (!revenueData?.periods) {
      toast({
        title: "Export Failed",
        description: "No revenue data available to export",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      'Period',
      'Revenue',
      'Growth %',
      'Sales Count',
      'Quotes Generated',
      'Material Revenue',
      'Labor Revenue',
      'Other Revenue',
      'Top Categories'
    ];

    const csvContent = [
      headers.join(','),
      ...revenueData.periods.map((period: any) => [
        `"${period.name}"`,
        period.revenue,
        period.growth,
        period.salesCount,
        period.quotesGenerated,
        period.materialRevenue || 0,
        period.laborRevenue || 0,
        period.otherRevenue || 0,
        `"${period.topCategories?.join('; ') || 'N/A'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `revenue-trends-${timeframe}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Revenue trends report has been downloaded as CSV`,
    });
  };

  const chartData = revenueData?.periods?.map((period: any) => ({
    name: period.name,
    revenue: period.revenue,
    materialRevenue: period.materialRevenue || 0,
    laborRevenue: period.laborRevenue || 0,
    otherRevenue: period.otherRevenue || 0,
  })) || [];

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (growth: number) => {
    return growth > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getTrendColor = (growth: number) => {
    return growth > 0 ? "text-green-600" : "text-red-600";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue Trends
          </CardTitle>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(revenueData?.currentPeriodRevenue || 0)}
              </div>
              <div className="text-xs text-gray-600">Current Period</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {revenueData?.growthRate > 0 ? '+' : ''}{revenueData?.growthRate || 0}%
              </div>
              <div className="text-xs text-gray-600">Growth Rate</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">
                {formatCurrency(revenueData?.averageRevenue || 0)}
              </div>
              <div className="text-xs text-gray-600">Average</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-lg font-bold text-orange-600">
                {formatCurrency(revenueData?.projectedRevenue || 0)}
              </div>
              <div className="text-xs text-gray-600">Projected</div>
            </div>
          </div>

          {/* Period Breakdown */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {timeframe === 'monthly' ? 'Monthly' : timeframe === 'quarterly' ? 'Quarterly' : 'Yearly'} Performance
            </h4>
            <div className="space-y-3">
              {revenueData?.periods?.map((period: any, index: number) => (
                <div key={period.name} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium">{period.name}</div>
                      <div className="text-sm text-gray-600">
                        {period.salesCount} sales • {period.quotesGenerated} quotes generated
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{formatCurrency(period.revenue)}</div>
                      <div className={`flex items-center gap-1 text-sm ${getTrendColor(period.growth)}`}>
                        {getTrendIcon(period.growth)}
                        {period.growth > 0 ? '+' : ''}{period.growth}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Revenue breakdown */}
                  <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-medium">{formatCurrency(period.materialRevenue || 0)}</div>
                      <div className="text-gray-600">Materials</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-medium">{formatCurrency(period.laborRevenue || 0)}</div>
                      <div className="text-gray-600">Labor</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-medium">{formatCurrency(period.otherRevenue || 0)}</div>
                      <div className="text-gray-600">Other</div>
                    </div>
                  </div>

                  {/* Top performing categories */}
                  {period.topCategories && period.topCategories.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      <span className="text-sm text-gray-600">Top categories:</span>
                      <div className="flex gap-1 flex-wrap">
                        {period.topCategories.map((cat: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  No revenue data available for the selected timeframe
                </div>
              )}
            </div>
          </div>

          {/* Insights */}
          {revenueData?.insights && revenueData.insights.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h5 className="font-medium mb-2 text-blue-800">Revenue Insights</h5>
              <ul className="space-y-1 text-sm text-blue-700">
                {revenueData.insights.map((insight: string, index: number) => (
                  <li key={index}>• {insight}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={exportRevenueReport}>
              <Download className="h-4 w-4 mr-2" />
              Export Revenue Report
            </Button>
            <Dialog open={chartModalOpen} onOpenChange={setChartModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <LineChart className="h-4 w-4 mr-2" />
                  View Detailed Chart
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Detailed Revenue Analysis - {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} View
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  {/* Revenue Trend Line Chart */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Revenue Trend Over Time</h3>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Revenue']} />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#8884d8" 
                            strokeWidth={3}
                            dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Revenue Breakdown Bar Chart */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Revenue Breakdown by Category</h3>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: any, name) => [`$${value.toLocaleString()}`, name]} />
                          <Bar dataKey="materialRevenue" stackId="a" fill="#8884d8" name="Materials" />
                          <Bar dataKey="laborRevenue" stackId="a" fill="#82ca9d" name="Labor" />
                          <Bar dataKey="otherRevenue" stackId="a" fill="#ffc658" name="Other" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Key Performance Indicators */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Key Performance Indicators</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg border">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(revenueData?.currentPeriodRevenue || 0)}
                        </div>
                        <div className="text-sm text-gray-600">Current Period Revenue</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg border">
                        <div className="text-2xl font-bold text-green-600">
                          {revenueData?.growthRate > 0 ? '+' : ''}{revenueData?.growthRate || 0}%
                        </div>
                        <div className="text-sm text-gray-600">Growth Rate</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg border">
                        <div className="text-2xl font-bold text-purple-600">
                          {formatCurrency(revenueData?.averageRevenue || 0)}
                        </div>
                        <div className="text-sm text-gray-600">Average Revenue</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg border">
                        <div className="text-2xl font-bold text-orange-600">
                          {formatCurrency(revenueData?.projectedRevenue || 0)}
                        </div>
                        <div className="text-sm text-gray-600">Projected Next Period</div>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Composition Pie Chart */}
                  {chartData.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Total Revenue Composition</h3>
                      <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Materials', value: chartData.reduce((sum: number, item: any) => sum + item.materialRevenue, 0) },
                                { name: 'Labor', value: chartData.reduce((sum: number, item: any) => sum + item.laborRevenue, 0) },
                                { name: 'Other', value: chartData.reduce((sum: number, item: any) => sum + item.otherRevenue, 0) }
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {COLORS.map((color, index) => (
                                <Cell key={`cell-${index}`} fill={color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button onClick={exportRevenueReport} className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Export Detailed Report
                    </Button>
                    <Button variant="outline" onClick={() => setChartModalOpen(false)} className="flex-1">
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}