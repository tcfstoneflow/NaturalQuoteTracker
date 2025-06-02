import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function RevenueTrendsReport() {
  const [timeframe, setTimeframe] = useState("monthly");
  
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ["/api/reports/revenue-trends", timeframe],
    queryFn: () => fetch(`/api/reports/revenue-trends?timeframe=${timeframe}`).then(res => res.json()),
  });

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
            <Button variant="outline" className="flex-1">
              Export Revenue Report
            </Button>
            <Button variant="outline" className="flex-1">
              View Detailed Chart
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}