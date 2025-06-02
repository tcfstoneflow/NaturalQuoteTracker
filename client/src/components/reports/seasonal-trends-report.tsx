import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Snowflake, Sun, Leaf, Cloud } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SeasonalTrendsReport() {
  const { data: trendsData, isLoading } = useQuery({
    queryKey: ["/api/reports/seasonal-trends"],
    queryFn: () => fetch("/api/reports/seasonal-trends").then(res => res.json()),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Seasonal Trends Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeasonIcon = (season: string) => {
    switch (season.toLowerCase()) {
      case 'spring': return <Leaf className="h-5 w-5 text-green-500" />;
      case 'summer': return <Sun className="h-5 w-5 text-yellow-500" />;
      case 'fall': case 'autumn': return <Cloud className="h-5 w-5 text-orange-500" />;
      case 'winter': return <Snowflake className="h-5 w-5 text-blue-500" />;
      default: return <Calendar className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeasonColor = (season: string) => {
    switch (season.toLowerCase()) {
      case 'spring': return 'bg-green-50 border-green-200';
      case 'summer': return 'bg-yellow-50 border-yellow-200';
      case 'fall': case 'autumn': return 'bg-orange-50 border-orange-200';
      case 'winter': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getTrendBadge = (trend: number) => {
    if (trend > 15) return { variant: "default" as const, text: "High Peak", color: "bg-green-100 text-green-800" };
    if (trend > 5) return { variant: "secondary" as const, text: "Above Average", color: "bg-blue-100 text-blue-800" };
    if (trend > -5) return { variant: "secondary" as const, text: "Average", color: "bg-gray-100 text-gray-800" };
    return { variant: "destructive" as const, text: "Below Average", color: "bg-red-100 text-red-800" };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Seasonal Trends Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Season Highlights */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              {getSeasonIcon(trendsData?.currentSeason || 'spring')}
              <h4 className="font-semibold">Current Season: {trendsData?.currentSeason || 'Spring'}</h4>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Peak Category:</span>
                <div className="font-medium">{trendsData?.currentPeakCategory || 'Granite'}</div>
              </div>
              <div>
                <span className="text-gray-600">Sales Increase:</span>
                <div className="font-medium text-green-600">
                  +{trendsData?.currentSeasonGrowth || '0'}%
                </div>
              </div>
            </div>
          </div>

          {/* Seasonal Breakdown */}
          <div>
            <h4 className="font-semibold mb-4">Seasonal Performance by Category</h4>
            <div className="space-y-4">
              {trendsData?.seasonalData?.map((season: any) => (
                <div key={season.season} className={`p-4 rounded-lg border ${getSeasonColor(season.season)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getSeasonIcon(season.season)}
                      <h5 className="font-medium">{season.season}</h5>
                    </div>
                    <Badge className={getTrendBadge(season.overallTrend).color}>
                      {season.overallTrend > 0 ? '+' : ''}{season.overallTrend}%
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {season.topCategories?.map((category: any, index: number) => (
                      <div key={category.name} className="bg-white p-3 rounded border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">#{index + 1} {category.name}</span>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="text-gray-600">
                          {category.salesVolume} sales | +{category.growth}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Peak month: {category.peakMonth}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  No seasonal trends data available
                </div>
              )}
            </div>
          </div>

          {/* Monthly Patterns */}
          {trendsData?.monthlyPatterns && (
            <div>
              <h4 className="font-semibold mb-3">Monthly Sales Patterns</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {trendsData.monthlyPatterns.map((month: any) => (
                  <div key={month.month} className="p-3 bg-gray-50 rounded text-center">
                    <div className="font-medium text-sm">{month.month}</div>
                    <div className="text-lg font-bold text-blue-600">{month.avgSales}</div>
                    <div className="text-xs text-gray-600">avg sales</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {trendsData?.recommendations && trendsData.recommendations.length > 0 && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-semibold mb-2 text-yellow-800">Seasonal Recommendations</h4>
              <ul className="space-y-1 text-sm text-yellow-700">
                {trendsData.recommendations.map((rec: string, index: number) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}

          <Button variant="outline" className="w-full">
            View Historical Seasonal Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}