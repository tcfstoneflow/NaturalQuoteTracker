import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { salesDashboardApi } from "@/lib/api";
import { useLocation } from "wouter";
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
  Edit,
  X,
  FileText,
  Send
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import TopBar from "@/components/layout/topbar";
import { useState } from "react";

export default function SalesDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);
  const [isEditingQuote, setIsEditingQuote] = useState(false);
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

  const [quoteEditForm, setQuoteEditForm] = useState({
    clientId: '',
    projectName: '',
    status: '',
    notes: '',
    validUntil: '',
    assignedSalesRep: '',
    items: [] as any[],
    additionalMessage: '',
    creditCardProcessing: false,
    subtotal: 0,
    processingFee: 0,
    tax: 0,
    totalAmount: 0
  });

  // Quick Actions state
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [isScheduleFollowUpOpen, setIsScheduleFollowUpOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [reportsPeriod, setReportsPeriod] = useState('Month');
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    salesManagerId: 'none',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    notes: ''
  });
  const [followUpForm, setFollowUpForm] = useState({
    clientId: '',
    name: '',
    email: '',
    phone: '',
    preferredDate: '',
    preferredTime: '',
    message: ''
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

  // Mutation for creating new client
  const createClientMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/clients', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-dashboard/my-clients"] });
      setIsNewClientDialogOpen(false);
      setNewClientForm({
        name: '',
        email: '',
        phone: '',
        company: '',
        salesManagerId: 'none',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        notes: ''
      });
    },
  });

  // Mutation for scheduling follow-up
  const scheduleFollowUpMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/showroom-visits', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-dashboard/pending-showroom-visits"] });
      setIsScheduleFollowUpOpen(false);
      setFollowUpForm({
        clientId: '',
        name: '',
        email: '',
        phone: '',
        preferredDate: '',
        preferredTime: '',
        message: ''
      });
    },
  });

  // Mutation for updating quotes
  const updateQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', `/api/quotes/${selectedQuote.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes', selectedClient?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/client-stats', selectedClient?.id] });
      setIsEditingQuote(false);
      setSelectedQuote(null);
    }
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
    
    // Force refetch sales managers when opening edit modal
    queryClient.invalidateQueries({ queryKey: ["/api/sales-dashboard/sales-managers"] });
  };

  const handleSaveAppointment = () => {
    // Find the assigned sales member name if a user is assigned
    const assignedSalesMember = editForm.assignedToUserId && editForm.assignedToUserId !== "none" 
      ? salesManagers.find((sm: any) => sm.id === parseInt(editForm.assignedToUserId))?.name
      : null;
    
    const updateData = {
      ...editForm,
      assignedToUserId: editForm.assignedToUserId && editForm.assignedToUserId !== "none" ? parseInt(editForm.assignedToUserId) : null,
      assignedSalesMember
    };
    updateAppointmentMutation.mutate(updateData);
  };

  // Handle edit quote
  const handleEditQuote = (quote: any) => {
    setSelectedQuote(quote);
    setQuoteEditForm({
      clientId: quote.clientId?.toString() || selectedClient?.id?.toString() || '',
      projectName: quote.projectName || '',
      status: quote.status || 'pending',
      notes: quote.notes || '',
      validUntil: quote.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : '',
      assignedSalesRep: quote.createdBy?.toString() || '',
      items: quote.items || [],
      additionalMessage: quote.additionalMessage || '',
      creditCardProcessing: quote.creditCardProcessing || false,
      subtotal: parseFloat(quote.subtotal || 0),
      processingFee: parseFloat(quote.processingFee || 0),
      tax: parseFloat(quote.tax || 0),
      totalAmount: parseFloat(quote.totalAmount || 0)
    });
    setIsEditingQuote(true);
  };

  const handleSaveQuote = () => {
    updateQuoteMutation.mutate(quoteEditForm);
  };

  // Quote item management functions
  const addQuoteItem = () => {
    setQuoteEditForm(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1, pricePerSlab: 0 }]
    }));
  };

  const removeQuoteItem = (index: number) => {
    setQuoteEditForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateQuoteItem = (index: number, field: string, value: any) => {
    setQuoteEditForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = quoteEditForm.items.reduce((sum, item) => 
      sum + (parseFloat(item.quantity || 0) * parseFloat(item.pricePerSlab || 0)), 0
    );
    
    const processingFee = quoteEditForm.creditCardProcessing ? subtotal * 0.035 : 0;
    const tax = subtotal * 0.085; // 8.5% tax
    const totalAmount = subtotal + processingFee + tax;

    setQuoteEditForm(prev => ({
      ...prev,
      subtotal,
      processingFee,
      tax,
      totalAmount
    }));
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

  // Fetch client statistics when a client is selected
  const { data: clientStats } = useQuery({
    queryKey: ["/api/client-stats", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return null;
      const response = await apiRequest('GET', `/api/clients/${selectedClient.id}/stats`);
      return response.json();
    },
    enabled: !!selectedClient?.id,
  });

  // Fetch client quotes when a client is selected
  const { data: clientQuotes } = useQuery({
    queryKey: ["/api/quotes", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const response = await fetch(`/api/quotes?clientId=${selectedClient.id}`);
      return response.json();
    },
    enabled: !!selectedClient?.id,
  });

  // Get all clients for dropdown
  const { data: allClients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clients');
      return response.json();
    }
  });

  // Get all products for quote items
  const { data: allProducts } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/products');
      return response.json();
    }
  });


  
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

  // Get sales managers for assignment - always fetch since we might need them
  const { data: salesManagers = [], isLoading: salesManagersLoading, error: salesManagersError } = useQuery({
    queryKey: ["/api/sales-dashboard/sales-managers"],
    queryFn: salesDashboardApi.getSalesManagers,
  });

  // Top selling products query for reports
  const { data: topSellingProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/dashboard/top-selling-products"],
    enabled: isReportsModalOpen,
  });



  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title={`Welcome back, ${user?.firstName || user?.username || 'there'}!`}
        subtitle="Your personalized sales dashboard"
      />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Enhanced Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <Card className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <div className="flex items-baseline space-x-2">
                      <p className="text-3xl font-bold text-gray-900">
                        ${(salesStats?.monthlyRevenue || 0).toLocaleString()}
                      </p>
                      <DollarSign className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Approved quotes only</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conversion Rate */}
            <Card className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                    <div className="flex items-baseline space-x-2">
                      <p className="text-3xl font-bold text-blue-600">
                        {quotesArray.length > 0 
                          ? ((quotesArray.filter(q => q.status === 'approved' || q.status === 'accepted').length / quotesArray.length) * 100).toFixed(1)
                          : 0}%
                      </p>
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Quote to approval rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Average Quote Value */}
            <Card className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Average Quote Value</p>
                    <div className="flex items-baseline space-x-2">
                      <p className="text-3xl font-bold text-gray-900">
                        ${quotesArray.length > 0 
                          ? (quotesArray.reduce((sum, quote) => sum + parseFloat(quote.totalAmount || 0), 0) / quotesArray.length).toLocaleString(undefined, {maximumFractionDigits: 0})
                          : 0}
                      </p>
                      <FileText className="h-5 w-5 text-orange-500" />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Across all quotes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* This Month */}
            <Card className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <div className="flex items-baseline space-x-2">
                      <p className="text-3xl font-bold text-purple-600">
                        {quotesArray.filter(q => {
                          const quoteDate = new Date(q.createdAt);
                          const now = new Date();
                          return quoteDate.getMonth() === now.getMonth() && quoteDate.getFullYear() === now.getFullYear();
                        }).length}
                      </p>
                      <Calendar className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex items-center space-x-1 mt-1">
                      <p className="text-sm text-gray-500">quotes</p>
                    </div>
                    <p className="text-sm text-gray-500">
                      {quotesArray.filter(q => q.status === 'pending').length} pending
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quote Status Distribution */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Quote Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* Pending */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-yellow-600 mb-2">
                    {quotesArray.filter(q => q.status === 'pending').length}
                  </div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Pending</div>
                  <div className="text-xs text-gray-500">
                    {quotesArray.length > 0 
                      ? ((quotesArray.filter(q => q.status === 'pending').length / quotesArray.length) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>

                {/* Approved */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {quotesArray.filter(q => q.status === 'approved' || q.status === 'accepted').length}
                  </div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Approved</div>
                  <div className="text-xs text-gray-500">
                    {quotesArray.length > 0 
                      ? ((quotesArray.filter(q => q.status === 'approved' || q.status === 'accepted').length / quotesArray.length) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>

                {/* Rejected */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-600 mb-2">
                    {quotesArray.filter(q => q.status === 'rejected').length}
                  </div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Rejected</div>
                  <div className="text-xs text-gray-500">
                    {quotesArray.length > 0 
                      ? ((quotesArray.filter(q => q.status === 'rejected').length / quotesArray.length) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>

                {/* Expired */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-600 mb-2">
                    {quotesArray.filter(q => {
                      if (!q.validUntil) return false;
                      return new Date(q.validUntil) < new Date() && q.status === 'pending';
                    }).length}
                  </div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Expired</div>
                  <div className="text-xs text-gray-500">
                    {quotesArray.length > 0 
                      ? ((quotesArray.filter(q => {
                          if (!q.validUntil) return false;
                          return new Date(q.validUntil) < new Date() && q.status === 'pending';
                        }).length / quotesArray.length) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
                      <div 
                        key={quote.id} 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors border border-transparent hover:border-blue-200"
                        onClick={() => setLocation(`/quotes?view=${quote.id}`)}
                      >
                        <div>
                          <div className="font-medium text-sm text-blue-600 hover:text-blue-800">{quote.quoteNumber}</div>
                          <div className="text-xs text-gray-600">{quote.client?.name}</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(quote.createdAt), "MMM d, yyyy")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">${parseFloat(quote.totalAmount || 0).toFixed(2)}</div>
                          <Badge 
                            variant={quote.status === 'pending' ? 'default' : 'secondary'}
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
                    <div 
                      key={client.id} 
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedClient(client)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{client.name}</div>
                        <Badge variant="default" className="bg-green-500 text-white">
                          Active
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">{client.email}</div>
                      <div className="text-sm text-gray-600 mb-3">{client.company || 'No company'}</div>
                      <div className="flex items-center justify-between">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `tel:${client.phone}`;
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
                            window.location.href = `mailto:${client.email}`;
                          }}
                        >
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <Button 
                  onClick={() => setIsNewClientDialogOpen(true)}
                  className="bg-accent-orange hover:bg-accent-orange/90 text-white h-auto py-4 flex-col"
                >
                  <Users className="h-6 w-6 mb-2" />
                  <span>Add New Client</span>
                </Button>
                <Button 
                  onClick={() => setIsScheduleFollowUpOpen(true)}
                  className="bg-success-green hover:bg-success-green/90 text-white h-auto py-4 flex-col"
                >
                  <Calendar className="h-6 w-6 mb-2" />
                  <span>Schedule Follow-up</span>
                </Button>
                <Button 
                  onClick={() => setIsReportsModalOpen(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white h-auto py-4 flex-col sm:col-span-2 xl:col-span-1"
                >
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span>View Reports</span>
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
                onValueChange={(value) => {
                  console.log('Sales member selected:', value);
                  setEditForm(prev => ({ ...prev, assignedToUserId: value }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={salesManagersLoading ? "Loading..." : "Select sales member"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No assignment</SelectItem>
                  {!salesManagersLoading && salesManagers.length > 0 && salesManagers.map((manager: any) => {

                    return (
                      <SelectItem key={manager.id} value={manager.id.toString()}>
                        {manager.name}
                      </SelectItem>
                    );
                  })}
                  {salesManagersLoading && (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <div className="text-xs text-gray-500 mt-1">
                Debug: {salesManagers.length} managers loaded, Loading: {salesManagersLoading ? 'true' : 'false'}
                {salesManagers.length > 0 && (
                  <div>Names: {salesManagers.map((m: any) => m.name).join(', ')}</div>
                )}
              </div>
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

      {/* Client Detail Modal */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
            <DialogDescription>
              Complete client information and interaction history
            </DialogDescription>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm text-gray-900">{selectedClient.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedClient.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900">{selectedClient.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Company</label>
                  <p className="text-sm text-gray-900">{selectedClient.company || 'No company'}</p>
                </div>
              </div>

              {/* Client Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {clientStats?.totalQuotes || 0}
                  </div>
                  <div className="text-xs text-gray-600">Total Quotes</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    ${clientStats?.totalValue?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-xs text-gray-600">Total Value</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">
                    {clientStats?.appointments || 0}
                  </div>
                  <div className="text-xs text-gray-600">Appointments</div>
                </div>
              </div>

              {/* Client Quotes Section */}
              {clientQuotes && clientQuotes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Recent Quotes</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {clientQuotes.map((quote: any) => (
                      <div 
                        key={quote.id} 
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => handleEditQuote(quote)}
                      >
                        <div>
                          <div className="font-medium text-sm">{quote.quoteNumber}</div>
                          <div className="text-xs text-gray-600">{quote.projectName}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">
                            ${parseFloat(quote.totalAmount || 0).toFixed(2)}
                          </div>
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            quote.status === 'approved' ? 'bg-green-100 text-green-800' :
                            quote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {quote.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    window.location.href = `mailto:${selectedClient.email}`;
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    window.location.href = `tel:${selectedClient.phone}`;
                  }}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call Client
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setSelectedClient(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Quote Modal */}
      <Dialog open={isEditingQuote} onOpenChange={setIsEditingQuote}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Quote</DialogTitle>
            <DialogDescription>
              Update the complete quote details below
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Client and Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Select Client *</label>
                <Select 
                  value={quoteEditForm.clientId} 
                  onValueChange={(value) => setQuoteEditForm(prev => ({ ...prev, clientId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {allClients?.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Quote Valid Until *</label>
                <Input
                  type="date"
                  value={quoteEditForm.validUntil}
                  onChange={(e) => setQuoteEditForm(prev => ({ ...prev, validUntil: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Project Name *</label>
              <Input
                value={quoteEditForm.projectName}
                onChange={(e) => setQuoteEditForm(prev => ({ ...prev, projectName: e.target.value }))}
                placeholder="Enter project name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Assigned Sales Rep</label>
              <Select 
                value={quoteEditForm.assignedSalesRep} 
                onValueChange={(value) => setQuoteEditForm(prev => ({ ...prev, assignedSalesRep: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sales representative..." />
                </SelectTrigger>
                <SelectContent>
                  {salesManagers?.map((rep: any) => (
                    <SelectItem key={rep.id} value={rep.id.toString()}>
                      {rep.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quote Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Quote Items</h3>
                <Button 
                  onClick={addQuoteItem}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  + Add Item
                </Button>
              </div>

              {quoteEditForm.items.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-700 pb-2 border-b">
                    <div className="col-span-5">Product *</div>
                    <div className="col-span-2">Quantity (slabs) *</div>
                    <div className="col-span-3">Price Per Slab *</div>
                    <div className="col-span-1">Total</div>
                    <div className="col-span-1"></div>
                  </div>

                  {quoteEditForm.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <Select 
                          value={item.productId} 
                          onValueChange={(value) => updateQuoteItem(index, 'productId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {allProducts?.map((product: any) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} - {product.thickness}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => {
                            updateQuoteItem(index, 'quantity', e.target.value);
                            setTimeout(calculateTotals, 100);
                          }}
                          placeholder="2.00"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.pricePerSlab}
                          onChange={(e) => {
                            updateQuoteItem(index, 'pricePerSlab', e.target.value);
                            setTimeout(calculateTotals, 100);
                          }}
                          placeholder="656.25"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        ${((parseFloat(item.quantity || 0) * parseFloat(item.pricePerSlab || 0)).toFixed(2))}
                      </div>
                      <div className="col-span-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeQuoteItem(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Processing Fee Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="creditCardProcessing"
                checked={quoteEditForm.creditCardProcessing}
                onCheckedChange={(checked) => {
                  setQuoteEditForm(prev => ({ ...prev, creditCardProcessing: !!checked }));
                  setTimeout(calculateTotals, 100);
                }}
              />
              <label htmlFor="creditCardProcessing" className="text-sm font-medium">
                Credit Card Processing Fee (3.5%)
              </label>
              <span className="ml-auto text-sm">
                +${quoteEditForm.processingFee.toFixed(2)}
              </span>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${quoteEditForm.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Processing Fee (3.5%):</span>
                <span>${quoteEditForm.processingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (8.5%):</span>
                <span>${quoteEditForm.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <span>Total:</span>
                <span>${quoteEditForm.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Additional Message */}
            <div>
              <label className="text-sm font-medium text-gray-700">Additional Message (for email)</label>
              <Textarea
                value={quoteEditForm.additionalMessage}
                onChange={(e) => setQuoteEditForm(prev => ({ ...prev, additionalMessage: e.target.value }))}
                placeholder="Optional message to include when sending the quote..."
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsEditingQuote(false)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
              <Button 
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                onClick={handleSaveQuote}
                disabled={updateQuoteMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {updateQuoteMutation.isPending ? 'Saving...' : 'Save & Send'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Client Modal */}
      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Full Name *</label>
                <Input
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder=""
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={newClientForm.email}
                  onChange={(e) => setNewClientForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder=""
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={newClientForm.phone}
                  onChange={(e) => setNewClientForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder=""
                />
              </div>
              <div>
                <label className="text-sm font-medium">Company</label>
                <Input
                  value={newClientForm.company}
                  onChange={(e) => setNewClientForm(prev => ({ ...prev, company: e.target.value }))}
                  placeholder=""
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Sales Manager</label>
              <Select 
                value={newClientForm.salesManagerId} 
                onValueChange={(value) => setNewClientForm(prev => ({ ...prev, salesManagerId: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No Sales Manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Sales Manager</SelectItem>
                  {salesManagers?.data?.map((manager: any) => (
                    <SelectItem key={manager.id} value={manager.id.toString()}>
                      {manager.firstName} {manager.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Address</label>
              <Input
                value={newClientForm.address}
                onChange={(e) => setNewClientForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder=""
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">City</label>
                <Input
                  value={newClientForm.city}
                  onChange={(e) => setNewClientForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder=""
                />
              </div>
              <div>
                <label className="text-sm font-medium">State</label>
                <Input
                  value={newClientForm.state}
                  onChange={(e) => setNewClientForm(prev => ({ ...prev, state: e.target.value }))}
                  placeholder=""
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">ZIP Code</label>
              <Input
                value={newClientForm.zipCode}
                onChange={(e) => setNewClientForm(prev => ({ ...prev, zipCode: e.target.value }))}
                placeholder=""
              />
            </div>

            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={newClientForm.notes}
                onChange={(e) => setNewClientForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder=""
                rows={3}
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsNewClientDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => createClientMutation.mutate(newClientForm)}
                disabled={createClientMutation.isPending || !newClientForm.name || !newClientForm.email}
              >
                {createClientMutation.isPending ? 'Creating...' : 'Create Client'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Follow-up Modal */}
      <Dialog open={isScheduleFollowUpOpen} onOpenChange={setIsScheduleFollowUpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
            <DialogDescription>
              Schedule a follow-up appointment or call
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Client Name *</label>
              <Input
                value={followUpForm.name}
                onChange={(e) => setFollowUpForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Client name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={followUpForm.email}
                  onChange={(e) => setFollowUpForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={followUpForm.phone}
                  onChange={(e) => setFollowUpForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Preferred Date</label>
                <Input
                  type="date"
                  value={followUpForm.preferredDate}
                  onChange={(e) => setFollowUpForm(prev => ({ ...prev, preferredDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Preferred Time</label>
                <Input
                  type="time"
                  value={followUpForm.preferredTime}
                  onChange={(e) => setFollowUpForm(prev => ({ ...prev, preferredTime: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={followUpForm.message}
                onChange={(e) => setFollowUpForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Purpose of follow-up or additional notes"
                rows={3}
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsScheduleFollowUpOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-success-green hover:bg-success-green/90"
                onClick={() => scheduleFollowUpMutation.mutate(followUpForm)}
                disabled={scheduleFollowUpMutation.isPending || !followUpForm.name || !followUpForm.email}
              >
                {scheduleFollowUpMutation.isPending ? 'Scheduling...' : 'Schedule Follow-up'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top Selling Products Reports Modal */}
      <Dialog open={isReportsModalOpen} onOpenChange={setIsReportsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Selling Products
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Period Filter */}
            <div className="flex gap-2">
              {['Day', 'Week', 'Month', 'Year'].map((period) => (
                <Button
                  key={period}
                  variant={reportsPeriod === period ? "default" : "outline"}
                  size="sm"
                  onClick={() => setReportsPeriod(period)}
                  className={reportsPeriod === period ? "bg-blue-500 text-white" : ""}
                >
                  {period}
                </Button>
              ))}
            </div>

            <div className="text-sm text-gray-600">
              Last 30 Days
            </div>

            {/* Products List */}
            <div className="space-y-3">
              {productsLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : topSellingProducts.length > 0 ? (
                topSellingProducts.slice(0, 4).map((product: any, index: number) => (
                  <div key={product.productId} className="flex items-center gap-4 p-4 border rounded-lg">
                    {/* Rank Circle */}
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>

                    {/* Product Image Placeholder */}
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                      <div className="w-12 h-12 bg-gray-300 rounded"></div>
                    </div>

                    {/* Product Info */}
                    <div className="flex-grow">
                      <h3 className="font-semibold text-lg">{product.productName || product.name}</h3>
                      <div className="text-sm text-gray-600">
                        {product.bundleId} • {product.category}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6 text-center">
                      <div>
                        <div className="text-green-600 font-bold">${product.totalRevenue?.toLocaleString() || '0'}</div>
                        <div className="text-xs text-gray-500">Revenue</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-500 rounded"></div>
                        </div>
                        <span className="font-bold">{product.totalQuantity || product.quantity || 0}</span>
                        <div className="text-xs text-gray-500">Qty</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-purple-100 rounded flex items-center justify-center">
                          <div className="w-2 h-2 bg-purple-500 rounded"></div>
                        </div>
                        <span className="font-bold">{product.orderCount || 1}</span>
                        <div className="text-xs text-gray-500">Orders</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No sales data available for the selected period
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}