import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Truck, Clock, Star, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

export default function SupplierPerformanceReport() {
  const [showDetailedView, setShowDetailedView] = useState(false);
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

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowDetailedView(true)}
          >
            View Detailed Supplier Reports
          </Button>
        </div>
      </CardContent>

      {/* Detailed Supplier Analysis Modal */}
      <Dialog open={showDetailedView} onOpenChange={setShowDetailedView}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detailed Supplier Performance Analysis</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-6">
            {/* Overall Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {supplierData?.averageDeliveryTime || '0'} days
                </div>
                <div className="text-sm text-gray-600">Average Delivery Time</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {supplierData?.averageQualityScore || '0'}%
                </div>
                <div className="text-sm text-gray-600">Average Quality Score</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {supplierData?.suppliers?.length || '0'}
                </div>
                <div className="text-sm text-gray-600">Active Suppliers</div>
              </div>
            </div>

            {/* Detailed Supplier Breakdown */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-500" />
                Complete Supplier Performance
              </h3>
              <div className="space-y-4">
                {supplierData?.suppliers?.map((supplier: any) => (
                  <div key={supplier.name} className="p-6 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-lg">{supplier.name}</h4>
                        <div className="text-sm text-gray-600">
                          {supplier.productsSupplied} products • {supplier.totalOrders} orders
                        </div>
                      </div>
                      <Badge className={supplier.overallScore >= 85 ? "bg-green-100 text-green-800" : 
                                       supplier.overallScore >= 70 ? "bg-yellow-100 text-yellow-800" : 
                                       "bg-red-100 text-red-800"}>
                        Overall: {supplier.overallScore}%
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">On-Time Delivery</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={supplier.onTimeDelivery} className="flex-1 h-3" />
                          <span className="text-sm font-bold">{supplier.onTimeDelivery}%</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">Quality Score</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={supplier.qualityScore} className="flex-1 h-3" />
                          <span className="text-sm font-bold">{supplier.qualityScore}%</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">Cost Efficiency</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={supplier.costEfficiency} className="flex-1 h-3" />
                          <span className="text-sm font-bold">{supplier.costEfficiency}%</span>
                        </div>
                      </div>
                    </div>

                    {supplier.issues && supplier.issues.length > 0 && (
                      <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-sm">
                          <span className="font-medium text-red-800">Recent Issues: </span>
                          <span className="text-red-700">{supplier.issues.join(", ")}</span>
                        </div>
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

            {/* Performance Insights */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-800">Supplier Performance Insights</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Average delivery time: {supplierData?.averageDeliveryTime || 0} days across all suppliers</p>
                <p>• Quality scores above 85% indicate reliable suppliers with consistent product standards</p>
                <p>• Cost efficiency measures value for money considering price, quality, and delivery performance</p>
                <p>• Monitor supplier performance monthly to maintain strong vendor relationships</p>
                <p>• Consider diversifying suppliers for critical product categories to reduce risk</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}