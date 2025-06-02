import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calculator, TrendingUp, TrendingDown, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CostAnalysisReport() {
  const { data: costData, isLoading } = useQuery({
    queryKey: ["/api/reports/cost-analysis"],
    queryFn: () => fetch("/api/reports/cost-analysis").then(res => res.json()),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cost Analysis
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return "text-green-600 bg-green-100";
    if (efficiency >= 60) return "text-blue-600 bg-blue-100";
    if (efficiency >= 40) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Cost Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Cost Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-lg font-bold text-red-600">
                {formatCurrency(costData?.totalCosts || 0)}
              </div>
              <div className="text-xs text-gray-600">Total Costs</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(costData?.avgCostPerSale || 0)}
              </div>
              <div className="text-xs text-gray-600">Avg Cost/Sale</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {costData?.costEfficiency || 0}%
              </div>
              <div className="text-xs text-gray-600">Cost Efficiency</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">
                {formatCurrency(costData?.targetSavings || 0)}
              </div>
              <div className="text-xs text-gray-600">Target Savings</div>
            </div>
          </div>

          {/* Cost Breakdown by Category */}
          <div>
            <h4 className="font-semibold mb-3">Cost Analysis by Product Category</h4>
            <div className="space-y-4">
              {costData?.categories?.map((category: any) => (
                <div key={category.name} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium">{category.name}</div>
                      <div className="text-sm text-gray-600">
                        {category.productCount} products • {category.salesVolume} units sold
                      </div>
                    </div>
                    <Badge className={getEfficiencyColor(category.efficiency)}>
                      {category.efficiency}% efficient
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <div className="text-sm text-gray-600">Material Cost</div>
                      <div className="font-medium">{formatCurrency(category.materialCost)}</div>
                      <Progress value={(category.materialCost / category.totalCost) * 100} className="h-1 mt-1" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Labor Cost</div>
                      <div className="font-medium">{formatCurrency(category.laborCost)}</div>
                      <Progress value={(category.laborCost / category.totalCost) * 100} className="h-1 mt-1" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Overhead</div>
                      <div className="font-medium">{formatCurrency(category.overhead)}</div>
                      <Progress value={(category.overhead / category.totalCost) * 100} className="h-1 mt-1" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Total Cost</div>
                      <div className="font-medium">{formatCurrency(category.totalCost)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-600">
                        Avg Selling Price: {formatCurrency(category.avgSellingPrice)}
                      </span>
                      <span className="text-gray-600">
                        Markup: {category.markup}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(category.costTrend)}
                      <span className={category.costTrend > 0 ? 'text-red-600' : 'text-green-600'}>
                        {category.costTrend > 0 ? '+' : ''}{category.costTrend}% cost change
                      </span>
                    </div>
                  </div>

                  {category.optimizationTips && (
                    <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                      <strong>Optimization tip:</strong> {category.optimizationTips}
                    </div>
                  )}
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  No cost analysis data available
                </div>
              )}
            </div>
          </div>

          {/* Pricing Optimization Opportunities */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Pricing Optimization Opportunities
            </h4>
            <div className="space-y-3">
              {costData?.optimizationOpportunities?.map((opportunity: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{opportunity.category}</div>
                    <Badge variant="outline">
                      {formatCurrency(opportunity.potentialSavings)} potential savings
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {opportunity.description}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Current Cost: </span>
                      <span className="font-medium">{formatCurrency(opportunity.currentCost)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Optimized Cost: </span>
                      <span className="font-medium text-green-600">{formatCurrency(opportunity.optimizedCost)}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs text-gray-600 mb-1">Implementation Priority</div>
                    <Progress 
                      value={opportunity.priority === 'High' ? 100 : opportunity.priority === 'Medium' ? 60 : 30} 
                      className="h-2"
                    />
                  </div>
                </div>
              )) || (
                <div className="text-center py-4 text-gray-500">
                  No optimization opportunities identified
                </div>
              )}
            </div>
          </div>

          {/* Key Insights */}
          {costData?.insights && costData.insights.length > 0 && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h5 className="font-medium mb-2 text-yellow-800">Cost Analysis Insights</h5>
              <ul className="space-y-1 text-sm text-yellow-700">
                {costData.insights.map((insight: string, index: number) => (
                  <li key={index}>• {insight}</li>
                ))}
              </ul>
            </div>
          )}

          <Button variant="outline" className="w-full">
            Generate Cost Optimization Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}