import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Package, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryTurnoverReport() {
  const { data: turnoverData, isLoading } = useQuery({
    queryKey: ["/api/reports/inventory-turnover"],
    queryFn: () => fetch("/api/reports/inventory-turnover").then(res => res.json()),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Turnover Analysis
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Inventory Turnover Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {turnoverData?.averageTurnover || '0'}x
              </div>
              <div className="text-sm text-gray-600">Avg Turnover Rate</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {turnoverData?.fastMoving?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Fast Moving Items</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {turnoverData?.slowMoving?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Slow Moving Items</div>
            </div>
          </div>

          {/* Fast Moving Products */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Fast Moving Products
            </h4>
            <div className="space-y-2">
              {turnoverData?.fastMoving?.slice(0, 5).map((product: any) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-600">{product.category}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      {product.turnoverRate}x/month
                    </Badge>
                    <div className="text-sm text-gray-600 mt-1">
                      {product.totalSold} sold
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-4 text-gray-500">
                  No fast-moving products data available
                </div>
              )}
            </div>
          </div>

          {/* Slow Moving Products */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Slow Moving Products
            </h4>
            <div className="space-y-2">
              {turnoverData?.slowMoving?.slice(0, 5).map((product: any) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-600">{product.category}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {product.daysInStock} days
                    </Badge>
                    <div className="text-sm text-gray-600 mt-1">
                      {product.currentStock} in stock
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-4 text-gray-500">
                  No slow-moving products data available
                </div>
              )}
            </div>
          </div>

          <Button variant="outline" className="w-full">
            View Detailed Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}