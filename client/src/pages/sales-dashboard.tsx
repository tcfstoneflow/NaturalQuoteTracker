import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { salesDashboardApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Target, 
  DollarSign, 
  Clock,
  Phone,
  Mail,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import TopBar from "@/components/layout/topbar";

export default function SalesDashboard() {
  const { user } = useAuth();
  
  // Get sales rep's personalized data
  const { data: salesStats } = useQuery({
    queryKey: ["/api/sales-dashboard/stats"],
    queryFn: salesDashboardApi.getStats,
  });

  const { data: myQuotes } = useQuery({
    queryKey: ["/api/sales-dashboard/recent-quotes"],
    queryFn: salesDashboardApi.getRecentQuotes,
  });

  const { data: myClients } = useQuery({
    queryKey: ["/api/sales-dashboard/my-clients"],
    queryFn: salesDashboardApi.getMyClients,
  });

  // Debug logging
  console.log('Sales Dashboard - myQuotes data:', myQuotes);
  console.log('Sales Dashboard - myQuotes type:', typeof myQuotes);
  console.log('Sales Dashboard - myQuotes length:', myQuotes?.length);
  
  // Ensure we have an array
  const quotesArray = Array.isArray(myQuotes) ? myQuotes : [];
  const clientsArray = Array.isArray(myClients) ? myClients : [];

  const { data: myActivities } = useQuery({
    queryKey: ["/api/sales-dashboard/recent-activities"],
    queryFn: salesDashboardApi.getRecentActivities,
  });

  const { data: pendingVisits } = useQuery({
    queryKey: ["/api/sales-dashboard/pending-showroom-visits"],
    queryFn: salesDashboardApi.getPendingShowroomVisits,
  });

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title={`Welcome back, ${user?.firstName || user?.username || 'Sales Rep'}!`}
        subtitle="Your personalized sales dashboard"
      />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month's Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-success-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success-green">
                  ${salesStats?.monthlyRevenue || "0"}
                </div>
                <p className="text-xs text-gray-600">
                  {salesStats?.monthlyGrowth >= 0 ? '+' : ''}{salesStats?.monthlyGrowth || 0}% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Quotes</CardTitle>
                <Target className="h-4 w-4 text-accent-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent-blue">
                  {salesStats?.activeQuotes || 0}
                </div>
                <p className="text-xs text-gray-600">
                  {salesStats?.pendingQuotes || 0} pending approval
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Clients</CardTitle>
                <Users className="h-4 w-4 text-accent-orange" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent-orange">
                  {clientsArray.length}
                </div>
                <p className="text-xs text-gray-600">
                  {salesStats?.newClientsThisMonth || 0} new this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Follow-ups Due</CardTitle>
                <Clock className="h-4 w-4 text-error-red" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-error-red">
                  {salesStats?.followUpsDue || 0}
                </div>
                <p className="text-xs text-gray-600">
                  Action needed today
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Quotes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent-blue" />
                  My Recent Quotes
                </CardTitle>
                <CardDescription>Track your latest quote submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quotesArray.length > 0 ? (
                    quotesArray.slice(0, 5).map((quote: any) => (
                      <div key={quote.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{quote.quoteNumber}</div>
                          <div className="text-xs text-gray-600">{quote.client?.name}</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(quote.createdAt), "MMM d, yyyy")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">${quote.total || '0.00'}</div>
                          <Badge 
                            variant={quote.status === 'sent' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {quote.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No quotes yet. Create your first quote!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Follow-ups */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-error-red" />
                  Today's Follow-ups
                </CardTitle>
                <CardDescription>Clients requiring attention today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingVisits?.slice(0, 5).map((visit: any) => (
                    <div key={visit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{visit.clientName}</div>
                        <div className="text-xs text-gray-600">{visit.requestType}</div>
                        <div className="text-xs text-gray-500">
                          Requested: {format(new Date(visit.createdAt), "MMM d")}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                          <Mail className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-gray-500">
                      No follow-ups scheduled for today
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* My Top Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent-orange" />
                My Top Clients
              </CardTitle>
              <CardDescription>Your most valuable client relationships</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientsArray.length > 0 ? (
                  clientsArray.slice(0, 6).map((client: any) => (
                    <div key={client.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{client.name}</div>
                        <Badge variant="default" className="bg-green-500 text-white">
                          Active
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">{client.email}</div>
                      <div className="text-sm text-gray-600 mb-3">{client.company || 'No company'}</div>
                      <div className="flex items-center justify-between">
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                          <Mail className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No clients yet. Create your first quote!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Streamline your daily tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="bg-accent-blue hover:bg-accent-blue text-white h-auto py-4 flex-col">
                  <Target className="h-6 w-6 mb-2" />
                  <span>Create New Quote</span>
                </Button>
                <Button className="bg-accent-orange hover:bg-accent-orange text-white h-auto py-4 flex-col">
                  <Users className="h-6 w-6 mb-2" />
                  <span>Add New Client</span>
                </Button>
                <Button className="bg-success-green hover:bg-success-green text-white h-auto py-4 flex-col">
                  <Calendar className="h-6 w-6 mb-2" />
                  <span>Schedule Follow-up</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}