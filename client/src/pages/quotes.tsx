import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TopBar from "@/components/layout/topbar";
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
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

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

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

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

  const filteredQuotes = quotes?.filter((quote: any) => {
    const matchesSearch = quote.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         quote.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         quote.client.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         quote.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    const matchesCreatedBy = createdByFilter === "all" || quote.createdBy?.toString() === createdByFilter;
    return matchesSearch && matchesStatus && matchesCreatedBy;
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

  const isQuoteExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Quotes" 
        subtitle="Manage and track your client quotes"
        onSearch={setSearchQuery}
      />

      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50-custom">
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
                    {users?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.firstName || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-accent-orange hover:bg-accent-orange text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Quote
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
                  {searchQuery || statusFilter !== "all" 
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
                    <TableHead>Valid Until</TableHead>
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
                              {quote.client.company || quote.client.name}
                            </p>
                            <p className="text-sm text-secondary-custom">{quote.client.name}</p>
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
                          <div className={`text-sm ${expired ? 'text-error-red font-medium' : 'text-secondary-custom'}`}>
                            {new Date(quote.validUntil).toLocaleDateString()}
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
                        <Label className="text-sm font-medium text-secondary-custom">Created By</Label>
                        <CreatedByInfo createdBy={selectedQuote.createdBy} />
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
    </div>
  );
}