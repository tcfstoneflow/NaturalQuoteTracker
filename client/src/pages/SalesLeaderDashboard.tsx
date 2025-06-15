import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users,
  TrendingUp,
  DollarSign,
  Target,
  Award,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  BarChart3,
  PieChart,
  Activity,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

interface SalesTeamMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phoneNumber?: string;
  isActive: boolean;
  lastLogin?: string;
  clientsAssigned: number;
  quotesGenerated: number;
  totalSales: string;
  conversionRate: number;
}

interface SalesMetrics {
  totalRevenue: string;
  monthlyGrowth: number;
  activeClients: number;
  pendingQuotes: number;
  teamPerformance: number;
  topPerformer: string;
}

interface RecentActivity {
  id: number;
  type: string;
  description: string;
  timestamp: string;
  userId?: number;
  userName?: string;
}

export default function SalesLeaderDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [approvalNotes, setApprovalNotes] = useState<Record<number, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sales leader metrics from the backend
  const { data: salesLeaderData, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/sales-leader/dashboard"]
  });

  // Fetch team performance report
  const { data: teamReport, isLoading: teamLoading } = useQuery({
    queryKey: ["/api/reports/team-performance"]
  });

  // Quote approval mutation
  const approveQuoteMutation = useMutation({
    mutationFn: async ({ quoteId, approved, notes }: { 
      quoteId: number; 
      approved: boolean; 
      notes?: string; 
    }) => {
      return apiRequest(`/api/quotes/${quoteId}/approve`, {
        method: "PATCH",
        body: { approved, notes }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-leader/dashboard"] });
      toast({
        title: "Quote Updated",
        description: "Quote approval status has been updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update quote approval",
        variant: "destructive"
      });
    }
  });

  const handleQuoteApproval = (quoteId: number, approved: boolean) => {
    const notes = approvalNotes[quoteId] || "";
    approveQuoteMutation.mutate({ quoteId, approved, notes });
  };

  if (metricsLoading || teamLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Activity className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const metrics = salesLeaderData?.dashboardStats || {};
  const pendingQuotes = salesLeaderData?.pendingQuotes || [];
  const teamMembers = salesLeaderData?.teamMembers || [];
  const monthlyMetrics = salesLeaderData?.monthlyMetrics || {};

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Sales Leader Dashboard</h1>
          <p className="text-muted-foreground">Team performance and business insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="approvals">Quote Approvals</TabsTrigger>
          <TabsTrigger value="team">Team Management</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${Number(metrics.monthlyQuoteValue || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">Monthly Quote Value</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalTeamMembers || 0}</div>
                <p className="text-xs text-muted-foreground">Active sales team</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.pendingApprovals || 0}</div>
                <p className="text-xs text-muted-foreground">Quotes awaiting approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.approvalRate || 0}%</div>
                <Progress value={metrics.approvalRate || 0} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Team Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Total Team Quotes</span>
                    <span className="font-medium">{monthlyMetrics.totalQuotes || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Approved This Month</span>
                    <span className="font-medium">{monthlyMetrics.approvedQuotes || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Monthly Quote Value</span>
                    <span className="font-medium">
                      ${Number(monthlyMetrics.totalValue || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingQuotes.slice(0, 3).map((quote: any) => (
                    <div key={quote.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Quote #{quote.quoteNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          ${Number(quote.totalAmount).toLocaleString()} • {quote.client?.name}
                        </p>
                      </div>
                    </div>
                  ))}
                  {pendingQuotes.length === 0 && (
                    <p className="text-sm text-muted-foreground">No pending approvals</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-4" onClick={() => setActiveTab("approvals")}>
                  View All Approvals
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="approvals">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Quote Approvals</h3>
              <Badge variant="secondary">{pendingQuotes.length} Pending</Badge>
            </div>

            {pendingQuotes.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">No quotes pending approval at this time.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingQuotes.map((quote: any) => (
                  <Card key={quote.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <Clock className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold">
                                Quote #{quote.quoteNumber}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {quote.projectName}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div>
                              <p className="text-sm font-medium">Client</p>
                              <p className="text-sm text-muted-foreground">
                                {quote.client?.name}
                                {quote.client?.company && ` (${quote.client.company})`}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Sales Rep</p>
                              <p className="text-sm text-muted-foreground">
                                {quote.salesRep?.firstName} {quote.salesRep?.lastName}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Quote Value</p>
                              <p className="text-lg font-semibold text-green-600">
                                ${Number(quote.totalAmount).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <p className="text-sm font-medium mb-2">Approval Notes</p>
                            <Textarea
                              placeholder="Add notes for this approval decision..."
                              value={approvalNotes[quote.id] || ""}
                              onChange={(e) => setApprovalNotes(prev => ({
                                ...prev,
                                [quote.id]: e.target.value
                              }))}
                              className="mb-3"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuoteApproval(quote.id, false)}
                          disabled={approveQuoteMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleQuoteApproval(quote.id, true)}
                          disabled={approveQuoteMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="team">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Sales Team Members</h3>
              <Badge variant="secondary">{teamMembers.length} Active Members</Badge>
            </div>

            <div className="grid gap-4">
              {teamMembers.map((member: any) => (
                <Card key={member.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold">
                              {member.firstName} {member.lastName}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {member.role.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate">{member.email}</span>
                          </div>
                          {member.phoneNumber && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span>{member.phoneNumber}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <Activity className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {member.isActive ? (
                                <Badge className="bg-green-100 text-green-800">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold">{member.clientsAssigned}</div>
                            <div className="text-xs text-muted-foreground">Clients</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{member.quotesGenerated}</div>
                            <div className="text-xs text-muted-foreground">Quotes</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{member.totalSales}</div>
                            <div className="text-xs text-muted-foreground">Sales</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{member.conversionRate}%</div>
                            <div className="text-xs text-muted-foreground">Conv. Rate</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Team Performance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesTeam?.slice(0, 5).map((member, index) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="font-medium">
                          {member.firstName} {member.lastName}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{member.conversionRate}%</div>
                        <div className="text-xs text-muted-foreground">Conversion</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Sales Goals Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Monthly Target</span>
                      <span className="text-sm text-muted-foreground">75% Complete</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Quarterly Target</span>
                      <span className="text-sm text-muted-foreground">58% Complete</span>
                    </div>
                    <Progress value={58} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Annual Target</span>
                      <span className="text-sm text-muted-foreground">42% Complete</span>
                    </div>
                    <Progress value={42} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>Team Activity Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities?.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium">{activity.description}</p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        By {activity.userName} • {activity.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}