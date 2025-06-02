import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfitMarginAnalysis() {
  const { data: marginData, isLoading } = useQuery({
    queryKey: ["/api/reports/profit-margins"],
    queryFn: () => fetch("/api/reports/profit-margins").then(res => res.json()),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Profit Margin Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getMarginColor = (margin: number) => {
    if (margin >= 40) return "text-green-600 bg-green-100";
    if (margin >= 25) return "text-blue-600 bg-blue-100";
    if (margin >= 15) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Profit Margin Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {marginData?.overallMargin || '0'}%
              </div>
              <div className="text-sm text-gray-600">Overall Margin</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                ${marginData?.totalProfit?.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-gray-600">Total Profit</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {marginData?.bestCategory || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Best Category</div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div>
            <h4 className="font-semibold mb-3">Profit Margins by Category</h4>
            <div className="space-y-3">
              {marginData?.categories?.map((category: any) => (
                <div key={category.name} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium">{category.name}</div>
                      <div className="text-sm text-gray-600">
                        {category.productCount} products • ${category.totalRevenue?.toLocaleString()} revenue
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getMarginColor(category.margin)}`}>
                      {category.margin}% margin
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-600">Cost</span>
                        <span className="font-medium">${category.avgCost}</span>
                      </div>
                      <Progress value={(category.avgCost / category.avgPrice) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-600">Selling Price</span>
                        <span className="font-medium">${category.avgPrice}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {category.trend > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-sm ${category.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {category.trend > 0 ? '+' : ''}{category.trend}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Markup: {category.markup}%</span>
                    <span className="font-medium text-green-600">
                      Profit: ${category.profit?.toLocaleString()}
                    </span>
                  </div>

                  {category.recommendations && (
                    <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                      <strong>Recommendation:</strong> {category.recommendations}
                    </div>
                  )}
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  No profit margin data available
                </div>
              )}
            </div>
          </div>

          <Button variant="outline" className="w-full">
            Export Margin Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}