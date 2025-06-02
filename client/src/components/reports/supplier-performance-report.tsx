import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Truck, Clock, Star, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SupplierPerformanceReport() {
  const { data: supplierData, isLoading } = useQuery({
    queryKey: ["/api/reports/supplier-performance"],
    queryFn: () => fetch("/api/reports/supplier-performance").then(res => res.json()),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Supplier Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-100";
    if (score >= 75) return "text-blue-600 bg-blue-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getDeliveryBadge = (onTimePercentage: number) => {
    if (onTimePercentage >= 95) return { variant: "default" as const, text: "Excellent", color: "bg-green-100 text-green-800" };
    if (onTimePercentage >= 85) return { variant: "secondary" as const, text: "Good", color: "bg-blue-100 text-blue-800" };
    if (onTimePercentage >= 75) return { variant: "secondary" as const, text: "Fair", color: "bg-yellow-100 text-yellow-800" };
    return { variant: "destructive" as const, text: "Poor", color: "bg-red-100 text-red-800" };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Supplier Performance Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {supplierData?.averageDeliveryTime || '0'} days
              </div>
              <div className="text-sm text-gray-600">Avg Delivery Time</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {supplierData?.averageQualityScore || '0'}%
              </div>
              <div className="text-sm text-gray-600">Avg Quality Score</div>
            </div>
          </div>

          {/* Supplier Rankings */}
          <div>
            <h4 className="font-semibold mb-3">Supplier Rankings</h4>
            <div className="space-y-3">
              {supplierData?.suppliers?.map((supplier: any, index: number) => (
                <div key={supplier.name} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-semibold">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{supplier.name}</div>
                        <div className="text-sm text-gray-600">
                          {supplier.totalOrders} orders | {supplier.productsSupplied} products
                        </div>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPerformanceColor(supplier.overallScore)}`}>
                      {supplier.overallScore}% overall
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">On-Time Delivery</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={supplier.onTimeDelivery} className="flex-1 h-2" />
                        <Badge className={getDeliveryBadge(supplier.onTimeDelivery).color}>
                          {supplier.onTimeDelivery}%
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Quality Rating</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={supplier.qualityScore} className="flex-1 h-2" />
                        <span className="text-sm font-medium">{supplier.qualityScore}%</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Cost Efficiency</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={supplier.costEfficiency} className="flex-1 h-2" />
                        <span className="text-sm font-medium">{supplier.costEfficiency}%</span>
                      </div>
                    </div>
                  </div>

                  {supplier.issues && supplier.issues.length > 0 && (
                    <div className="mt-3 p-2 bg-red-50 rounded text-sm">
                      <span className="text-red-600 font-medium">Recent Issues: </span>
                      <span className="text-red-700">{supplier.issues.join(", ")}</span>
                    </div>
                  )}
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  No supplier performance data available
                </div>
              )}
            </div>
          </div>

          <Button variant="outline" className="w-full">
            View Detailed Supplier Reports
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}