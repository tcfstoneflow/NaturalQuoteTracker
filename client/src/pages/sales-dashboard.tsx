import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { salesDashboardApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  AlertCircle,
  Edit
} from "lucide-react";
import { format } from "date-fns";
import TopBar from "@/components/layout/topbar";
import { useState } from "react";

export default function SalesDashboard() {
  const { user } = useAuth();
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    preferredDate: '',
    preferredTime: '',
    message: '',
    status: '',
    assignedToUserId: '',
    assignedSalesMember: ''
  });
  
  const queryClient = useQueryClient();

  // Mutation for updating appointments
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', `/api/showroom-visits/${selectedAppointment.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-dashboard/pending-showroom-visits"] });
      setIsEditingAppointment(false);
      setSelectedAppointment(null);
    },
  });

  // Handle edit appointment
  const handleEditAppointment = () => {
    setEditForm({
      name: selectedAppointment.name || '',
      email: selectedAppointment.email || '',
      phone: selectedAppointment.phone || '',
      preferredDate: selectedAppointment.preferredDate || '',
      preferredTime: selectedAppointment.preferredTime || '',
      message: selectedAppointment.message || '',
      status: selectedAppointment.status || 'pending',
      assignedToUserId: selectedAppointment.assignedToUserId?.toString() || '',
      assignedSalesMember: selectedAppointment.assignedSalesMember || ''
    });
    setIsEditingAppointment(true);
  };

  const handleSaveAppointment = () => {
    updateAppointmentMutation.mutate(editForm);
  };
  
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

  // Get sales managers for assignment
  const { data: salesManagers = [] } = useQuery({
    queryKey: ["/api/sales-dashboard/sales-managers"],
    queryFn: salesDashboardApi.getSalesManagers,
    enabled: isEditingAppointment,
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
                <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
                <Clock className="h-4 w-4 text-error-red" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-error-red">
                  {salesStats?.followUpsDue || 0}
                </div>
                <p className="text-xs text-gray-600">
                  Total scheduled
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

            {/* Upcoming Appointments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-error-red" />
                  Upcoming Appointments
                </CardTitle>
                <CardDescription>All scheduled client appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingVisits?.slice(0, 10).map((visit: any) => (
                    <div 
                      key={visit.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => setSelectedAppointment(visit)}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{visit.clientName || visit.name}</div>
                        <div className="text-xs text-gray-600">{visit.requestType || 'Showroom Visit'}</div>
                        <div className="text-xs text-gray-500">
                          {visit.preferredDate ? 
                            `${format(new Date(visit.preferredDate), "MMM d, yyyy")}${visit.preferredTime ? ` at ${visit.preferredTime}` : ''}` :
                            `Requested: ${format(new Date(visit.createdAt), "MMM d, yyyy")}`
                          }
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle phone call
                          }}
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle email
                          }}
                        >
                          <Mail className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-gray-500">
                      No upcoming appointments scheduled
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

      {/* Appointment Details Modal */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>
              Complete information for this scheduled appointment
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Client Name</label>
                  <p className="text-sm text-gray-900">{selectedAppointment.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Badge variant="outline" className={
                    selectedAppointment.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    selectedAppointment.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    selectedAppointment.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }>
                    {selectedAppointment.status?.charAt(0).toUpperCase() + selectedAppointment.status?.slice(1)}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{selectedAppointment.email}</p>
              </div>

              {selectedAppointment.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900">{selectedAppointment.phone}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Date</label>
                  <p className="text-sm text-gray-900">
                    {selectedAppointment.preferredDate ? 
                      format(new Date(selectedAppointment.preferredDate), "MMM d, yyyy") :
                      'Not scheduled'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Time</label>
                  <p className="text-sm text-gray-900">
                    {selectedAppointment.preferredTime || 'Not specified'}
                  </p>
                </div>
              </div>

              {selectedAppointment.message && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Message</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedAppointment.message}
                  </p>
                </div>
              )}

              {selectedAppointment.assignedSalesMember && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Assigned Sales Member</label>
                  <p className="text-sm text-gray-900">{selectedAppointment.assignedSalesMember}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleEditAppointment}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Appointment
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    window.location.href = `mailto:${selectedAppointment.email}`;
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email Client
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Modal */}
      <Dialog open={isEditingAppointment} onOpenChange={setIsEditingAppointment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
            <DialogDescription>
              Update the appointment details below
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Client Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter client name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Date</label>
                <Input
                  type="date"
                  value={editForm.preferredDate}
                  onChange={(e) => setEditForm(prev => ({ ...prev, preferredDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Time</label>
                <Input
                  type="time"
                  value={editForm.preferredTime}
                  onChange={(e) => setEditForm(prev => ({ ...prev, preferredTime: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Assign Sales Member</label>
              <Select 
                value={editForm.assignedToUserId} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, assignedToUserId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sales member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No assignment</SelectItem>
                  {salesManagers.map((manager: any) => (
                    <SelectItem key={manager.id} value={manager.id.toString()}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Message</label>
              <Textarea
                value={editForm.message}
                onChange={(e) => setEditForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Enter message or notes"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsEditingAppointment(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSaveAppointment}
                disabled={updateAppointmentMutation.isPending}
              >
                {updateAppointmentMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}