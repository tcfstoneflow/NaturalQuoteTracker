import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { clientsApi } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Mail, Phone, Building, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isQuoteViewModalOpen, setIsQuoteViewModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [viewingClient, setViewingClient] = useState<any>(null);
  const [viewingQuote, setViewingQuote] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    notes: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clients, isLoading } = useQuery({
    queryKey: ['/api/clients', searchQuery],
    queryFn: () => clientsApi.getAll(searchQuery || undefined),
  });

  // Fetch client quotes/purchase history when viewing a client
  const { data: clientQuotes } = useQuery({
    queryKey: ['/api/quotes', { clientId: viewingClient?.id }],
    queryFn: () => 
      viewingClient ? fetch(`/api/quotes?clientId=${viewingClient.id}`).then(res => res.json()) : [],
    enabled: !!viewingClient,
  });

  const createMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Success",
        description: "Client created successfully",
      });
      handleCloseModal();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
      handleCloseModal();
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
    mutationFn: clientsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Success",
        description: "Client deleted successfully",
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

  const handleOpenCreateModal = () => {
    setEditingClient(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      notes: "",
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (client: any) => {
    setEditingClient(client);
    setFormData(client);
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingClient(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (clientId: number) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      deleteMutation.mutate(clientId);
    }
  };

  const handleViewClient = (client: any) => {
    setViewingClient(client);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingClient(null);
  };

  const handleViewQuote = (quote: any) => {
    setViewingQuote(quote);
    setIsQuoteViewModalOpen(true);
  };

  const handleCloseQuoteModal = () => {
    setIsQuoteViewModalOpen(false);
    setViewingQuote(null);
  };

  // Quote action mutations
  const deleteQuoteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      await apiRequest("DELETE", `/api/quotes/${quoteId}`);
    },
    onSuccess: () => {
      // Invalidate multiple cache keys to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success",
        description: "Quote deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete quote",
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      await apiRequest("POST", `/api/quotes/${quoteId}/send-email`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quote email sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    },
  });

  // Quote action handlers
  const handleEditQuote = (quoteId: number) => {
    setLocation(`/quotes?edit=${quoteId}`);
  };

  const handleDownloadQuote = async (quoteId: number) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/pdf`);
      if (!response.ok) throw new Error('Failed to download PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `quote-${quoteId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = (quoteId: number) => {
    sendEmailMutation.mutate(quoteId);
  };

  const handleDeleteQuote = (quoteId: number, quoteName: string) => {
    // Prevent multiple deletion attempts
    if (deleteQuoteMutation.isPending) return;
    
    if (window.confirm(`Are you sure you want to delete quote ${quoteName}?`)) {
      deleteQuoteMutation.mutate(quoteId);
    }
  };

  const generateAISummary = async (client: any) => {
    if (!client || isGeneratingAI) return;
    
    setIsGeneratingAI(true);
    try {
      const response = await apiRequest("POST", "/api/clients/ai-summary", {
        clientId: client.id
      });
      const result = await response.json();
      setAiSummary(result.summary);
    } catch (error) {
      console.error("Error generating AI summary:", error);
      toast({
        title: "Error",
        description: "Failed to generate AI summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const generateAIPurchaseSummary = async (clientId: number) => {
    setIsGeneratingAI(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/ai-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate AI summary');
      }
      
      const data = await response.json();
      setAiSummary(data.summary);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setAiSummary('Unable to generate purchase summary at this time.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Clients" 
        subtitle="Manage your client relationships"
        onSearch={setSearchQuery}
      />
      
      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50-custom">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Client Directory</CardTitle>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreateModal} className="bg-primary hover:bg-primary-dark">
                  <Plus size={16} className="mr-2" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingClient ? "Edit Client" : "Add New Client"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                  <div className="flex space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCloseModal}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingClient ? "Update Client" : "Create Client"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>

          {/* Client Detail Modal */}
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Client Details</DialogTitle>
              </DialogHeader>
              {viewingClient && (
                <div className="space-y-6">
                  {/* Client Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-primary-custom">Contact Information</h3>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Name</Label>
                          <p className="text-sm text-gray-700">{viewingClient.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Email</Label>
                          <p className="text-sm text-gray-700">{viewingClient.email || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Phone</Label>
                          <p className="text-sm text-gray-700">{viewingClient.phone || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Company</Label>
                          <p className="text-sm text-gray-700">{viewingClient.company || '—'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-primary-custom">Address Information</h3>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Address</Label>
                          <p className="text-sm text-gray-700">{viewingClient.address || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">City</Label>
                          <p className="text-sm text-gray-700">{viewingClient.city || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">State</Label>
                          <p className="text-sm text-gray-700">{viewingClient.state || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">ZIP Code</Label>
                          <p className="text-sm text-gray-700">{viewingClient.zipCode || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {viewingClient.notes && (
                    <div>
                      <h3 className="text-lg font-semibold text-primary-custom mb-2">Notes</h3>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{viewingClient.notes}</p>
                    </div>
                  )}

                  {/* Purchase History */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-primary-custom">Purchase History</h3>
                      {clientQuotes && clientQuotes.length > 0 && (
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total Amount</p>
                          <p className="text-lg font-semibold text-primary-custom">
                            ${clientQuotes.reduce((total: number, quote: any) => total + parseFloat(quote.subtotal || 0), 0).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                    {clientQuotes && clientQuotes.length > 0 ? (
                      <div className="space-y-3">
                        {clientQuotes.map((quote: any) => (
                          <div 
                            key={quote.id} 
                            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div 
                              className="cursor-pointer"
                              onClick={() => {
                                handleViewQuote(quote);
                              }}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-medium text-blue-600 hover:text-blue-800">{quote.quoteNumber}</h4>
                                  <p className="text-sm text-gray-600">{quote.projectName}</p>
                                </div>
                                <Badge 
                                  variant={quote.status === 'approved' ? 'default' : 'secondary'}
                                  className={
                                    quote.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    quote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }
                                >
                                  {quote.status}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center text-sm text-gray-600">
                                <span>Created: {new Date(quote.createdAt).toLocaleDateString()}</span>
                                <span className="font-medium">${parseFloat(quote.subtotal || 0).toLocaleString()}</span>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewQuote(quote);
                                }}
                                className="h-8 w-8 p-0"
                                title="View Quote"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditQuote(quote.id);
                                }}
                                className="h-8 w-8 p-0"
                                title="Edit Quote"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadQuote(quote.id);
                                }}
                                className="h-8 w-8 p-0"
                                title="Download PDF"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendEmail(quote.id);
                                }}
                                className="h-8 w-8 p-0"
                                title="Send Email"
                                disabled={sendEmailMutation.isPending}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteQuote(quote.id, quote.quoteNumber);
                                }}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                title="Delete Quote"
                                disabled={deleteQuoteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">No purchase history available</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleCloseViewModal}>Close</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Quote Detail Modal */}
          <Dialog open={isQuoteViewModalOpen} onOpenChange={setIsQuoteViewModalOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Quote Details</DialogTitle>
              </DialogHeader>
              {viewingQuote && (
                <div className="space-y-6">
                  {/* Quote Header */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-primary-custom">Quote Information</h3>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Quote Number</Label>
                          <p className="text-sm text-gray-700">{viewingQuote.quoteNumber}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Project Name</Label>
                          <p className="text-sm text-gray-700">{viewingQuote.projectName}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Status</Label>
                          <Badge 
                            variant={viewingQuote.status === 'approved' ? 'default' : 'secondary'}
                            className={
                              viewingQuote.status === 'approved' ? 'bg-green-100 text-green-800' :
                              viewingQuote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              viewingQuote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {viewingQuote.status}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Created Date</Label>
                          <p className="text-sm text-gray-700">{new Date(viewingQuote.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-primary-custom">Client Information</h3>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Client Name</Label>
                          <p className="text-sm text-gray-700">{viewingQuote.client.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Email</Label>
                          <p className="text-sm text-gray-700">{viewingQuote.client.email || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Phone</Label>
                          <p className="text-sm text-gray-700">{viewingQuote.client.phone || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Company</Label>
                          <p className="text-sm text-gray-700">{viewingQuote.client.company || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quote Description */}
                  {viewingQuote.description && (
                    <div>
                      <h3 className="text-lg font-semibold text-primary-custom mb-2">Description</h3>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{viewingQuote.description}</p>
                    </div>
                  )}

                  {/* Line Items */}
                  <div>
                    <h3 className="text-lg font-semibold text-primary-custom mb-4">Quote Items</h3>
                    {viewingQuote.lineItems && viewingQuote.lineItems.length > 0 ? (
                      <div className="space-y-3">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border border-gray-300 p-2 text-left">Product</th>
                                <th className="border border-gray-300 p-2 text-right">Quantity</th>
                                <th className="border border-gray-300 p-2 text-right">Unit Price</th>
                                <th className="border border-gray-300 p-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {viewingQuote.lineItems.map((item: any, index: number) => (
                                <tr key={index}>
                                  <td className="border border-gray-300 p-2">
                                    <div>
                                      <p className="font-medium">{item.product?.name || 'Unknown Product'}</p>
                                      {item.notes && <p className="text-sm text-gray-600">{item.notes}</p>}
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right">{item.quantity}</td>
                                  <td className="border border-gray-300 p-2 text-right">${parseFloat(item.unitPrice || 0).toLocaleString()}</td>
                                  <td className="border border-gray-300 p-2 text-right">${parseFloat(item.totalPrice || 0).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex justify-end">
                          <div className="text-right">
                            <p className="text-lg font-semibold">
                              Total: ${parseFloat(viewingQuote.subtotal || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">No items in this quote</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleCloseQuoteModal}>Close</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading clients...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients?.map((client: any) => (
                    <TableRow 
                      key={client.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleViewClient(client)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-primary-custom">{client.name}</p>
                          <p className="text-sm text-secondary-custom">
                            Added {new Date(client.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Mail size={14} className="text-secondary-custom" />
                            <span className="text-sm">{client.email}</span>
                          </div>
                          {client.phone && (
                            <div className="flex items-center space-x-2">
                              <Phone size={14} className="text-secondary-custom" />
                              <span className="text-sm">{client.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.company ? (
                          <div className="flex items-center space-x-2">
                            <Building size={14} className="text-secondary-custom" />
                            <span>{client.company}</span>
                          </div>
                        ) : (
                          <span className="text-secondary-custom">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.city || client.state ? (
                          <span>{client.city}{client.city && client.state ? ', ' : ''}{client.state}</span>
                        ) : (
                          <span className="text-secondary-custom">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(client);
                            }}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(client.id);
                            }}
                            className="text-error-red hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
