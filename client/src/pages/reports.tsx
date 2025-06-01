import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dashboardApi, quotesApi, clientsApi, productsApi } from "@/lib/api";
import { TrendingUp, DollarSign, Users, Package, FileText, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import TopSellingProductsReport from "@/components/reports/top-selling-products-report";
import SalesManagerPerformanceReport from "@/components/reports/sales-manager-performance-report";

export default function Reports() {

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: dashboardApi.getStats,
  });

  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ['/api/quotes'],
    queryFn: quotesApi.getAll,
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: () => clientsApi.getAll(),
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
    queryFn: productsApi.getAll,
  });

  const isLoading = statsLoading || quotesLoading || clientsLoading || productsLoading;

  // Calculate additional metrics
  const calculateMetrics = () => {
    if (!quotes || !clients || !products) return null;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyQuotes = quotes.filter((quote: any) => {
      const quoteDate = new Date(quote.createdAt);
      return quoteDate.getMonth() === currentMonth && quoteDate.getFullYear() === currentYear;
    });

    const approvedQuotes = quotes.filter((quote: any) => quote.status === 'approved');
    const pendingQuotes = quotes.filter((quote: any) => quote.status === 'pending');
    const conversionRate = quotes.length > 0 ? (approvedQuotes.length / quotes.length) * 100 : 0;

    const totalRevenue = approvedQuotes.reduce((sum: number, quote: any) => 
      sum + parseFloat(quote.totalAmount), 0);

    const averageQuoteValue = quotes.length > 0 
      ? quotes.reduce((sum: number, quote: any) => sum + parseFloat(quote.totalAmount), 0) / quotes.length
      : 0;

    const topClients = clients
      .map((client: any) => {
        const clientQuotes = approvedQuotes.filter((quote: any) => quote.clientId === client.id);
        const totalSpent = clientQuotes.reduce((sum: number, quote: any) => 
          sum + parseFloat(quote.totalAmount), 0);
        return { ...client, totalSpent, quoteCount: clientQuotes.length };
      })
      .filter((client: any) => client.totalSpent > 0)
      .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    const categoryStats = products.reduce((acc: any, product: any) => {
      if (!acc[product.category]) {
        acc[product.category] = { count: 0, totalSlabs: 0, totalSquareFeet: 0, totalValue: 0 };
      }
      acc[product.category].count++;
      acc[product.category].totalSlabs += product.stockQuantity;
      
      // Calculate square feet and value if dimensions are available
      if (product.slabLength && product.slabWidth) {
        const lengthFt = parseFloat(product.slabLength) / 12;
        const widthFt = parseFloat(product.slabWidth) / 12;
        const slabArea = lengthFt * widthFt;
        const totalSlabSquareFeet = slabArea * product.stockQuantity;
        acc[product.category].totalSquareFeet += totalSlabSquareFeet;
        
        // Calculate inventory value: total square feet × price per square foot
        acc[product.category].totalValue += totalSlabSquareFeet * parseFloat(product.price);
      }
      
      return acc;
    }, {});

    return {
      monthlyQuotes: monthlyQuotes.length,
      conversionRate,
      totalRevenue,
      averageQuoteValue,
      topClients,
      categoryStats,
      pendingQuotes: pendingQuotes.length,
    };
  };

  const metrics = calculateMetrics();

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Reports" subtitle="Business analytics and insights" />
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-50-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Reports" 
        subtitle="Business analytics and insights"
      />
      
      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50-custom">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-custom text-sm font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold text-primary-custom">
                    ${metrics?.totalRevenue?.toLocaleString() || '0'}
                  </p>
                  <p className="text-success-green text-sm font-medium mt-1 flex items-center">
                    <TrendingUp size={12} className="mr-1" />
                    Approved quotes only
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-success-green" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-custom text-sm font-medium">Conversion Rate</p>
                  <p className="text-2xl font-bold text-primary-custom">
                    {metrics?.conversionRate?.toFixed(1) || '0'}%
                  </p>
                  <p className="text-secondary-custom text-sm font-medium mt-1">
                    Quote to approval rate
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-primary" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-custom text-sm font-medium">Average Quote Value</p>
                  <p className="text-2xl font-bold text-primary-custom">
                    ${metrics?.averageQuoteValue?.toLocaleString() || '0'}
                  </p>
                  <p className="text-secondary-custom text-sm font-medium mt-1">
                    Across all quotes
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-warning-orange" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-custom text-sm font-medium">This Month</p>
                  <p className="text-2xl font-bold text-primary-custom">
                    {metrics?.monthlyQuotes || 0} quotes
                  </p>
                  <p className="text-secondary-custom text-sm font-medium mt-1">
                    {metrics?.pendingQuotes || 0} pending
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="text-purple-600" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users size={20} />
                <span>Top Clients by Revenue</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics?.topClients.length > 0 ? (
                <div className="space-y-4">
                  {metrics.topClients.map((client: any, index: number) => (
                    <div key={client.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-primary-custom">
                            {client.company || client.name}
                          </p>
                          <p className="text-sm text-secondary-custom">
                            {client.quoteCount} quote{client.quoteCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary-custom">
                          ${client.totalSpent.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No client revenue data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package size={20} />
                <span>Inventory by Category</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics?.categoryStats && Object.keys(metrics.categoryStats).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(metrics.categoryStats).map(([category, stats]: [string, any]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-primary-custom capitalize">{category}</p>
                        <p className="text-sm text-secondary-custom">
                          {stats.count} product{stats.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary-custom">
                          {stats.totalValue > 0 
                            ? `$${stats.totalValue.toLocaleString()}`
                            : `${stats.totalSlabs} slabs`}
                        </p>
                        <p className="text-sm text-secondary-custom">
                          {stats.totalValue > 0 
                            ? `${stats.totalSlabs} slabs • ${stats.totalSquareFeet.toFixed(0)} sq ft`
                            : 'dimensions needed for value'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No inventory data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Advanced Reports Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp size={20} className="text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Advanced Reports</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Selling Products */}
            <TopSellingProductsReport />
            
            {/* Sales Manager Performance */}
            <SalesManagerPerformanceReport />
          </div>
        </div>

        {/* Quote Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Quote Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {quotes && quotes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['pending', 'approved', 'rejected', 'expired'].map((status) => {
                  const statusQuotes = quotes.filter((quote: any) => {
                    if (status === 'expired') {
                      return quote.status === 'pending' && new Date(quote.validUntil) < new Date();
                    }
                    return quote.status === status;
                  });
                  const percentage = quotes.length > 0 ? (statusQuotes.length / quotes.length) * 100 : 0;

                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'pending': return 'bg-yellow-100 text-yellow-800';
                      case 'approved': return 'bg-green-100 text-green-800';
                      case 'rejected': return 'bg-red-100 text-red-800';
                      case 'expired': return 'bg-gray-100 text-gray-800';
                      default: return 'bg-gray-100 text-gray-800';
                    }
                  };

                  return (
                    <div key={status} className="text-center p-4 border rounded-lg">
                      <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)} mb-2`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </div>
                      <p className="text-2xl font-bold text-primary-custom">{statusQuotes.length}</p>
                      <p className="text-sm text-secondary-custom">{percentage.toFixed(1)}%</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No quote data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products Modal */}
        <TopProductsModal 
          open={showTopProductsModal}
          onOpenChange={setShowTopProductsModal}
        />
      </div>
    </div>
  );
}
