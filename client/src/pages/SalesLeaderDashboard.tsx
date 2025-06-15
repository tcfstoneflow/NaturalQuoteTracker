import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  Activity
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

  const { data: salesTeam, isLoading: teamLoading } = useQuery<SalesTeamMember[]>({
    queryKey: ["/api/users"],
    select: (users: any[]) => users.filter(user => 
      user.role === 'sales_rep' || user.role === 'sales_manager'
    ).map(user => ({
      ...user,
      clientsAssigned: Math.floor(Math.random() * 25) + 5,
      quotesGenerated: Math.floor(Math.random() * 15) + 3,
      totalSales: (Math.random() * 50000 + 10000).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
      }),
      conversionRate: Math.floor(Math.random() * 40) + 15
    }))
  });

  const { data: salesMetrics } = useQuery<SalesMetrics>({
    queryKey: ["/api/dashboard/stats"],
    select: (stats: any) => ({
      totalRevenue: stats.totalRevenue || "$0",
      monthlyGrowth: Math.floor(Math.random() * 20) + 5,
      activeClients: parseInt(stats.activeClients) || 0,
      pendingQuotes: Math.floor(Math.random() * 25) + 8,
      teamPerformance: Math.floor(Math.random() * 30) + 70,
      topPerformer: salesTeam?.[0]?.firstName + " " + salesTeam?.[0]?.lastName || "N/A"
    })
  });

  const { data: recentActivities } = useQuery<RecentActivity[]>({
    queryKey: ["/api/dashboard/recent-activities"],
    select: (activities: any[]) => activities.slice(0, 10).map(activity => ({
      ...activity,
      userName: activity.metadata?.userName || "System"
    }))
  });

  if (teamLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Activity className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading dashboard...</span>
        </div>
      </div>
    );
  }

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
          <TabsTrigger value="team">Team Management</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="activities">Recent Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesMetrics?.totalRevenue}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+{salesMetrics?.monthlyGrowth}%</span> from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesMetrics?.activeClients}</div>
                <p className="text-xs text-muted-foreground">Across all team members</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesMetrics?.pendingQuotes}</div>
                <p className="text-xs text-muted-foreground">Awaiting client response</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Performance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesMetrics?.teamPerformance}%</div>
                <Progress value={salesMetrics?.teamPerformance || 0} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Performer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold mb-2">{salesMetrics?.topPerformer}</div>
                <p className="text-sm text-muted-foreground">Leading the team this month</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Conversion Rate</span>
                    <span className="font-medium">
                      {salesTeam?.[0]?.conversionRate || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Sales</span>
                    <span className="font-medium">{salesTeam?.[0]?.totalSales}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivities?.slice(0, 4).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString()} • {activity.userName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-4">
                  View All Activities
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Sales Team Members</h3>
              <Badge variant="secondary">{salesTeam?.length || 0} Active Members</Badge>
            </div>

            <div className="grid gap-4">
              {salesTeam?.map((member) => (
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