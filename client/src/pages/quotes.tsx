import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { quotesApi } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { Eye, Edit, Send, Download, FileText, Calendar, DollarSign, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QuoteBuilderModal from "@/components/quotes/quote-builder-modal";

// Component to show who created the quote
const CreatedByInfo = ({ createdBy }: { createdBy: number | null }) => {
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (!createdBy || !users) {
    return <span className="text-gray-400 text-sm">—</span>;
  }

  const creator = users.find((u: any) => u.id === createdBy);
  if (!creator) {
    return <span className="text-gray-400 text-sm">Unknown</span>;
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
        <span className="text-xs font-medium text-blue-600">
          {creator.firstName?.[0] || creator.username?.[0] || '?'}
        </span>
      </div>
      <span className="text-sm text-gray-700">
        {creator.firstName || creator.username}
      </span>
    </div>
  );
};

export default function Quotes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createdByFilter, setCreatedByFilter] = useState("all");
  const [salesStageFilter, setSalesStageFilter] = useState("all");
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRfpModalOpen, setIsRfpModalOpen] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [location] = useLocation();

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const highlightId = urlParams.get('highlight') || urlParams.get('view');

  // Check if user has permission for a specific action based on role templates
  const hasPermission = (module: string, action: string) => {
    if (!user?.user || !user.user.role) return false;
    
    if (user.user.role === 'admin') return true; // Admins have all permissions
    
    // Role-based permissions (matching User Management templates)
    const roleTemplates = {
      sales_rep: {
        inventory: ["view"],
        quotes: ["view", "create", "edit", "send_email"],
        clients: ["view", "create", "edit"],
        reports: ["view"]
      },
      inventory_specialist: {
        inventory: ["view", "create", "edit", "delete", "manage_stock"],
        quotes: ["view"],
        clients: ["view"],
        reports: ["view"]
      }
    };
    
    const rolePermissions = roleTemplates[user.user.role as keyof typeof roleTemplates];
    if (!rolePermissions) return false;
    
    const modulePermissions = rolePermissions[module as keyof typeof rolePermissions];
    return modulePermissions?.includes(action) || false;
  };

// Component to display who created the quote
const CreatedByInfo = ({ createdBy }: { createdBy: number | null }) => {
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users');
      return response.json();
    },
  });

  if (!createdBy) {
    return <span className="text-gray-400 text-sm">Unknown</span>;
  }

  const creator = users?.find((u: any) => u.id === createdBy);
  if (!creator) {
    return <span className="text-gray-400 text-sm">User #{createdBy}</span>;
  }

  return (
    <div className="text-sm">
      <div className="font-medium text-primary-custom">{creator.username}</div>
      <div className="text-gray-500">{creator.role}</div>
    </div>
  );
};

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['/api/quotes'],
    queryFn: quotesApi.getAll,
  });

  // Get all clients to calculate last touch for each quote's client
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Filter quotes based on user role
  const filteredQuotesByRole = quotes?.filter((quote: any) => {
    // Admins and managers can see all quotes
    if (user?.role === 'admin' || user?.role === 'sales_manager') {
      return true;
    }
    
    // Sales reps can only see quotes they created
    if (user?.role === 'sales_rep') {
      return quote.createdBy === user?.id;
    }
    
    // Default: show all quotes for other roles
    return true;
  }) || [];

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Handle URL parameters to auto-open specific quotes
  useEffect(() => {
    if (highlightId && filteredQuotesByRole) {
      const quoteToHighlight = filteredQuotesByRole.find((q: any) => q.id === parseInt(highlightId));
      if (quoteToHighlight) {
        setSelectedQuote(quoteToHighlight);
        setIsViewModalOpen(true);
        // Clear the URL parameter after opening
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [highlightId, filteredQuotesByRole]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      quotesApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-quotes'] });
      toast({
        title: "Success",
        description: "Quote status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSalesRepMutation = useMutation({
    mutationFn: ({ id, salesRepId }: { id: number; salesRepId: number | null }) => 
      quotesApi.update(id, { salesRepId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      toast({
        title: "Success",
        description: "Sales rep assignment updated successfully",
      });
      // Update the selected quote to reflect the change
      if (selectedQuote) {
        setSelectedQuote({ ...selectedQuote, salesRepId: variables.salesRepId });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSalesStageMutation = useMutation({
    mutationFn: ({ id, pipelineStage }: { id: number; pipelineStage: string }) => 
      quotesApi.update(id, { pipelineStage }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      toast({
        title: "Success",
        description: "Sales stage updated successfully",
      });
      // Update the selected quote to reflect the change
      if (selectedQuote) {
        setSelectedQuote({ ...selectedQuote, pipelineStage: variables.pipelineStage });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePipelineStageMutation = useMutation({
    mutationFn: ({ id, pipelineStage }: { id: number; pipelineStage: string }) => 
      quotesApi.update(id, { pipelineStage }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pipeline'] });
      toast({
        title: "Success",
        description: "Pipeline stage updated successfully",
      });
      // Update the selected quote to reflect the change
      if (selectedQuote) {
        setSelectedQuote({ ...selectedQuote, pipelineStage: variables.pipelineStage });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => quotesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-quotes'] });
      toast({
        title: "Success",
        description: "Quote deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message?: string }) => 
      quotesApi.sendEmail(id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      toast({
        title: "Success",
        description: "Quote sent successfully",
      });
      setIsSendModalOpen(false);
      setEmailMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleViewQuote = (quote: any) => {
    setSelectedQuote(quote);
    setIsViewModalOpen(true);
  };

  const handleSendQuote = (quote: any) => {
    setSelectedQuote(quote);
    setIsSendModalOpen(true);
  };

  const handleEditQuote = (quote: any) => {
    setSelectedQuote(quote);
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleDownloadPDF = async (quoteId: number, quoteNumber: string) => {
    try {
      const blob = await quotesApi.generatePDF(quoteId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quote-${quoteNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = (quoteId: number, newStatus: string) => {
    updateStatusMutation.mutate({ id: quoteId, status: newStatus });
  };

  const handleSendEmail = () => {
    if (selectedQuote) {
      sendEmailMutation.mutate({ 
        id: selectedQuote.id, 
        message: emailMessage.trim() || undefined 
      });
    }
  };

  const filteredQuotes = filteredQuotesByRole?.filter((quote: any) => {
    const matchesSearch = quote.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         quote.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         quote.client?.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         quote.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    const matchesCreatedBy = createdByFilter === "all" || quote.createdBy?.toString() === createdByFilter;
    const matchesSalesStage = salesStageFilter === "all" || quote.pipelineStage === salesStageFilter;
    return matchesSearch && matchesStatus && matchesCreatedBy && matchesSalesStage;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSalesStageColor = (stage: string) => {
    switch (stage) {
      case 'Active': return 'bg-blue-100 text-blue-800';
      case 'At Risk': return 'bg-orange-100 text-orange-800';
      case 'Actioned': return 'bg-purple-100 text-purple-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      case 'Won': return 'bg-green-100 text-green-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const isQuoteExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  // Calculate days since last client activity
  const getLastTouchDays = async (clientId: number) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/activities`);
      const activities = await response.json();
      
      if (!activities || activities.length === 0) {
        return "No activity";
      }

      // Get the most recent activity
      const mostRecentActivity = activities[0];
      const lastActivityDate = new Date(mostRecentActivity.createdAt);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - lastActivityDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch (error) {
      return "Unknown";
    }
  };

  // Store last touch data for each client
  const [lastTouchData, setLastTouchData] = useState<Record<number, string | number>>({});

  // Load last touch data for all clients when quotes load
  useEffect(() => {
    if (quotes && quotes.length > 0) {
      const clientIds = quotes.map((quote: any) => quote.clientId).filter(Boolean);
      const uniqueClientIds: number[] = [];
      
      clientIds.forEach((id: number) => {
        if (!uniqueClientIds.includes(id)) {
          uniqueClientIds.push(id);
        }
      });
      
      uniqueClientIds.forEach(async (clientId: number) => {
        if (!lastTouchData[clientId]) {
          const days = await getLastTouchDays(clientId);
          setLastTouchData(prev => ({ ...prev, [clientId]: days }));
        }
      });
    }
  }, [quotes]);

  const formatLastTouch = (clientId: number) => {
    const days = lastTouchData[clientId];
    if (days === "No activity" || days === "Unknown") {
      return days;
    }
    if (typeof days === 'number') {
      if (days === 0) return "Today";
      if (days === 1) return "1 day ago";
      return `${days} days ago`;
    }
    return "Loading...";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50-custom">
        {/* RFP Module */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Request for Proposal (RFP)</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Create and manage Request for Proposals to solicit vendor bids for your projects
            </p>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setIsRfpModalOpen(true)}
              className="bg-accent-orange hover:bg-accent-orange text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New RFP
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Quote Management</CardTitle>
              <div className="flex space-x-4 mt-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by created by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users?.filter((user: any) => user.isActive && user.role === 'sales_rep').map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.firstName || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={salesStageFilter} onValueChange={setSalesStageFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by sales stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sales Stages</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="At Risk">At Risk</SelectItem>
                    <SelectItem value="Actioned">Actioned</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="Won">Won</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-accent-orange hover:bg-accent-orange text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Quote Builder
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading quotes...</div>
            ) : !filteredQuotes || filteredQuotes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes found</h3>
                <p className="text-gray-500">
                  {searchQuery || statusFilter !== "all" || createdByFilter !== "all" || salesStageFilter !== "all"
                    ? "Try adjusting your search or filter criteria." 
                    : "Create your first quote to get started."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sales Stage</TableHead>
                    <TableHead>Last Touch</TableHead>
                    {user?.user?.role === 'admin' && <TableHead>Created By</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote: any) => {
                    const expired = isQuoteExpired(quote.validUntil);

                    return (
                      <TableRow key={quote.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-primary-custom">{quote.quoteNumber}</p>
                            <p className="text-sm text-secondary-custom">
                              {new Date(quote.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-primary-custom">
                              {quote.client?.company || quote.client?.name || 'No Client'}
                            </p>
                            <p className="text-sm text-secondary-custom">{quote.client?.name || 'Unknown'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-primary-custom">{quote.projectName}</p>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-primary-custom">
                            ${parseFloat(quote.totalAmount).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge className={`${getStatusColor(quote.status)} border-0`}>
                              {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                            </Badge>
                            {expired && quote.status === 'pending' && (
                              <Badge className="bg-red-100 text-red-800 border-0">
                                Expired
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getSalesStageColor(quote.pipelineStage)} border-0`}>
                            {quote.pipelineStage || 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-secondary-custom">
                            {formatLastTouch(quote.clientId)}
                          </div>
                        </TableCell>
                        {user?.user?.role === 'admin' && (
                          <TableCell>
                            <CreatedByInfo createdBy={quote.createdBy} />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewQuote(quote)}
                              title="View Details"
                            >
                              <Eye size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditQuote(quote)}
                              title="Edit Quote"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadPDF(quote.id, quote.quoteNumber)}
                              title="Download PDF"
                            >
                              <Download size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSendQuote(quote)}
                              title="Send Email"
                              disabled={sendEmailMutation.isPending}
                            >
                              <Send size={16} />
                            </Button>
                            {hasPermission('quotes', 'delete') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete quote ${quote.quoteNumber}?`)) {
                                    deleteMutation.mutate(quote.id);
                                  }
                                }}
                                title="Delete Quote"
                                disabled={deleteMutation.isPending}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Quote Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quote Details - {selectedQuote?.quoteNumber}</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-6">
              {/* Quote Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <FileText size={20} />
                      <span>Quote Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-secondary-custom">Quote Number</Label>
                        <p className="font-medium">{selectedQuote.quoteNumber}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-secondary-custom">Project Name</Label>
                        <p>{selectedQuote.projectName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-secondary-custom">Status</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={`${getStatusColor(selectedQuote.status)} border-0`}>
                            {selectedQuote.status.charAt(0).toUpperCase() + selectedQuote.status.slice(1)}
                          </Badge>
                          <Select 
                            value={selectedQuote.status} 
                            onValueChange={(value) => handleStatusChange(selectedQuote.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-secondary-custom">Pipeline Stage</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-medium">
                            {selectedQuote.pipelineStage || 'In-Flight'}
                          </span>
                          <Select 
                            value={selectedQuote.pipelineStage || 'In-Flight'} 
                            onValueChange={(value) => {
                              updatePipelineStageMutation.mutate({ 
                                id: selectedQuote.id, 
                                pipelineStage: value 
                              });
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="In-Flight">In-Flight</SelectItem>
                              <SelectItem value="At Risk">At Risk</SelectItem>
                              <SelectItem value="Actioned">Actioned</SelectItem>
                              <SelectItem value="Closed">Closed</SelectItem>
                              <SelectItem value="Won">Won</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-secondary-custom">Created By</Label>
                        <CreatedByInfo createdBy={selectedQuote.createdBy} />
                      </div>
                      {user?.user?.role === 'admin' && (
                        <div>
                          <Label className="text-sm font-medium text-secondary-custom">Sales Rep</Label>
                          <div className="flex items-center space-x-2 mt-1">
                            {selectedQuote.salesRepId ? (
                              <div className="text-sm">
                                <div className="font-medium text-primary-custom">
                                  {users?.find((u: any) => u.id === selectedQuote.salesRepId)?.username || 'Unknown'}
                                </div>
                                <div className="text-gray-500">
                                  {users?.find((u: any) => u.id === selectedQuote.salesRepId)?.role || ''}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">Not assigned</span>
                            )}
                            <Select 
                              value={selectedQuote.salesRepId?.toString() || "none"} 
                              onValueChange={(value) => {
                                const salesRepId = value === "none" ? null : parseInt(value);
                                updateSalesRepMutation.mutate({ 
                                  id: selectedQuote.id, 
                                  salesRepId 
                                });
                              }}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select sales rep" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No assignment</SelectItem>
                                {users?.filter((u: any) => u.role === 'sales_rep' || u.role === 'admin').map((user: any) => (
                                  <SelectItem key={user.id} value={user.id.toString()}>
                                    {user.username} ({user.role})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                      
                      {/* Sales Stage Selector */}
                      <div>
                        <Label className="text-sm font-medium text-secondary-custom">Sales Stage</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={`${getSalesStageColor(selectedQuote.pipelineStage)} border-0`}>
                            {selectedQuote.pipelineStage || 'Active'}
                          </Badge>
                          <Select 
                            value={selectedQuote.pipelineStage || "Active"} 
                            onValueChange={(value) => {
                              updateSalesStageMutation.mutate({ 
                                id: selectedQuote.id, 
                                pipelineStage: value 
                              });
                            }}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select sales stage" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Active">Active</SelectItem>
                              <SelectItem value="At Risk">At Risk</SelectItem>
                              <SelectItem value="Actioned">Actioned</SelectItem>
                              <SelectItem value="Closed">Closed</SelectItem>
                              <SelectItem value="Won">Won</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Calendar size={20} />
                      <span>Dates & Client</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-secondary-custom">Client</Label>
                        <p className="font-medium">{selectedQuote.client.company || selectedQuote.client.name}</p>
                        <p className="text-sm text-secondary-custom">{selectedQuote.client.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-secondary-custom">Created</Label>
                        <p>{new Date(selectedQuote.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-secondary-custom">Valid Until</Label>
                        <p className={isQuoteExpired(selectedQuote.validUntil) ? 'text-error-red font-medium' : ''}>
                          {new Date(selectedQuote.validUntil).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Line Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Quote Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedQuote.lineItems?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.product.name}</p>
                              <p className="text-sm text-secondary-custom">
                                {item.product.grade} • {item.product.thickness}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{parseFloat(item.quantity).toFixed(2)}</TableCell>
                          <TableCell>${parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                          <TableCell className="font-medium">
                            ${parseFloat(item.totalPrice).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Quote Totals */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign size={20} />
                    <span>Quote Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-w-md ml-auto">
                    <div className="flex justify-between">
                      <span className="text-secondary-custom">Subtotal:</span>
                      <span>${parseFloat(selectedQuote.subtotal).toFixed(2)}</span>
                    </div>
                    {selectedQuote.processingFee && parseFloat(selectedQuote.processingFee) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-secondary-custom">Processing Fee (3.5%):</span>
                        <span>${parseFloat(selectedQuote.processingFee).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-secondary-custom">
                        Tax ({(parseFloat(selectedQuote.taxRate) * 100).toFixed(2)}%):
                      </span>
                      <span>${parseFloat(selectedQuote.taxAmount).toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>${parseFloat(selectedQuote.totalAmount).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => handleEditQuote(selectedQuote)}
                  className="flex items-center space-x-2"
                >
                  <Edit size={16} />
                  <span>Edit Quote</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleDownloadPDF(selectedQuote.id, selectedQuote.quoteNumber)}
                  className="flex items-center space-x-2"
                >
                  <Download size={16} />
                  <span>Download PDF</span>
                </Button>
                <Button 
                  onClick={() => handleSendQuote(selectedQuote)}
                  className="flex items-center space-x-2 bg-accent-orange hover:bg-accent-orange text-white"
                >
                  <Send size={16} />
                  <span>Send Quote</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Email Modal */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Quote via Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Sending to:</Label>
              <p className="text-primary-custom font-medium">{selectedQuote?.client.email}</p>
            </div>
            <div>
              <Label htmlFor="emailMessage">Additional Message (Optional)</Label>
              <Textarea
                id="emailMessage"
                placeholder="Add a personal message to include with the quote..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsSendModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSendEmail}
                disabled={sendEmailMutation.isPending}
                className="flex-1 bg-accent-orange hover:bg-accent-orange text-white"
              >
                {sendEmailMutation.isPending ? "Sending..." : "Send Quote"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quote Builder Modal for Creating */}
      <QuoteBuilderModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Quote Builder Modal for Editing */}
      <QuoteBuilderModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editQuote={selectedQuote}
      />

      {/* RFP Modal */}
      <Dialog open={isRfpModalOpen} onOpenChange={setIsRfpModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Create Request for Proposal (RFP)</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="rfp-title">RFP Title</Label>
                <input
                  id="rfp-title"
                  type="text"
                  placeholder="Enter RFP title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <Label htmlFor="rfp-client">Client/Organization</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.company || client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rfp-description">Project Description</Label>
                <Textarea
                  id="rfp-description"
                  placeholder="Describe the project requirements, scope, and specifications"
                  rows={4}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rfp-deadline">Submission Deadline</Label>
                  <input
                    id="rfp-deadline"
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <Label htmlFor="rfp-budget">Estimated Budget</Label>
                  <input
                    id="rfp-budget"
                    type="number"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="rfp-requirements">Technical Requirements</Label>
                <Textarea
                  id="rfp-requirements"
                  placeholder="List specific technical requirements, materials, dimensions, etc."
                  rows={3}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="rfp-evaluation">Evaluation Criteria</Label>
                <Textarea
                  id="rfp-evaluation"
                  placeholder="How will proposals be evaluated? (e.g., price, quality, timeline, experience)"
                  rows={3}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsRfpModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-accent-orange hover:bg-accent-orange text-white"
                onClick={() => {
                  toast({
                    title: "RFP Created",
                    description: "Request for Proposal has been created and sent to vendors.",
                  });
                  setIsRfpModalOpen(false);
                }}
              >
                Create RFP
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}