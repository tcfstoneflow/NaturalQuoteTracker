import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Edit, Trash2, Mail, Phone, Building, Download, Eye, Upload, FileText } from "lucide-react";
import QuoteBuilderModal from "@/components/quotes/quote-builder-modal";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isQuoteViewModalOpen, setIsQuoteViewModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [viewingClient, setViewingClient] = useState<any>(null);
  const [viewingQuote, setViewingQuote] = useState<any>(null);
  const [editingQuote, setEditingQuote] = useState<any>(null);
  const [isEditQuoteModalOpen, setIsEditQuoteModalOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<{id: number, name: string} | null>(null);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isVisitorVisitModalOpen, setIsVisitorVisitModalOpen] = useState(false);
  const [isLoggingVisit, setIsLoggingVisit] = useState(false);
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
    salesManagerId: "",
  });

  const [quoteFormData, setQuoteFormData] = useState({
    clientId: "",
    projectName: "",
    description: "",
    validUntil: "",
    status: "pending",
    lineItems: [] as any[]
  });

  const [quoteLineItems, setQuoteLineItems] = useState<any[]>([]);
  const [productSearchTerms, setProductSearchTerms] = useState<{[key: number]: string}>({});
  const [ccProcessingFee, setCcProcessingFee] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

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

  // Fetch client activities (quotes and store visits) when viewing a client
  const { data: clientActivities } = useQuery({
    queryKey: ['/api/clients', viewingClient?.id, 'activities'],
    queryFn: () => 
      viewingClient ? fetch(`/api/clients/${viewingClient.id}/activities`).then(res => res.json()) : [],
    enabled: !!viewingClient,
  });

  // Fetch products for the quote creation modal
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    queryFn: () => fetch('/api/products').then(res => res.json()),
  });

  // Fetch sales managers for client assignment
  const { data: salesManagers } = useQuery({
    queryKey: ['/api/users/sales-managers'],
    queryFn: () => fetch('/api/users/sales-managers').then(res => res.json()),
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

  const bulkImportMutation = useMutation({
    mutationFn: async (clients: any[]) => {
      const formData = new FormData();
      formData.append('clients', JSON.stringify(clients));
      
      const response = await apiRequest('POST', '/api/clients/bulk-import', formData);
      return response.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Import Successful",
        description: `Successfully imported ${result.imported} clients. ${result.errors || 0} errors.`,
      });
      handleCloseBulkImport();
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (quoteData: any) => {
      const subtotal = calculateSubtotal();
      const processingFee = calculateProcessingFee(subtotal);
      const taxRate = 0.085;
      const taxAmount = subtotal * taxRate;
      const total = subtotal + processingFee + taxAmount;

      const formattedData = {
        quote: {
          clientId: parseInt(quoteData.clientId),
          projectName: quoteData.projectName,
          description: quoteData.description,
          validUntil: quoteData.validUntil,
          status: quoteData.status,
          subtotal: subtotal.toFixed(2),
          taxRate: taxRate.toFixed(4),
          taxAmount: taxAmount.toFixed(2),
          processingFee: processingFee.toFixed(2),
          totalAmount: total.toFixed(2),
          notes: quoteData.description
        },
        lineItems: quoteLineItems.map(item => ({
          productId: parseInt(item.productId) || null,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice) || 0,
          totalPrice: (item.quantity * parseFloat(item.unitPrice) || 0).toFixed(2)
        }))
      };
      
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData),
      });
      if (!response.ok) throw new Error('Failed to create quote');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setIsNewQuoteModalOpen(false);
      setQuoteFormData({
        clientId: "",
        projectName: "",
        description: "",
        validUntil: "",
        status: "pending",
        lineItems: []
      });
      setQuoteLineItems([]);
      toast({
        title: "Success",
        description: "Quote created successfully",
      });
    },
    onError: (error: Error) => {
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
      salesManagerId: "none",
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (client: any) => {
    setEditingClient(client);
    setFormData({
      ...client,
      salesManagerId: client.salesManagerId ? client.salesManagerId.toString() : "none",
    });
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingClient(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      salesManagerId: formData.salesManagerId && formData.salesManagerId !== "none" ? parseInt(formData.salesManagerId) : null,
    };
    
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
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

  const handleOpenNewQuoteModal = (client: any) => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    
    setQuoteFormData({
      clientId: client.id,
      projectName: "",
      description: "",
      validUntil: defaultDate.toISOString().split('T')[0],
      status: "pending",
      lineItems: []
    });
    setQuoteLineItems([]);
    setCcProcessingFee(false);
    setIsNewQuoteModalOpen(true);
  };



  const handleAddLineItem = () => {
    const newItem = {
      id: Date.now(),
      productId: "",
      productName: "",
      quantity: 1,
      unitPrice: 0,
      notes: ""
    };
    setQuoteLineItems(prev => [...prev, newItem]);
    setProductSearchTerms(prev => ({ ...prev, [newItem.id]: "" }));
  };

  const handleUpdateLineItem = (itemId: number, field: string, value: any) => {
    setQuoteLineItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const handleRemoveLineItem = (itemId: number) => {
    setQuoteLineItems(prev => prev.filter(item => item.id !== itemId));
    setProductSearchTerms(prev => {
      const newTerms = { ...prev };
      delete newTerms[itemId];
      return newTerms;
    });
  };

  const handleProductSearch = (itemId: number, searchTerm: string) => {
    setProductSearchTerms(prev => ({ ...prev, [itemId]: searchTerm }));
  };

  const handleSelectProduct = (itemId: number, product: any) => {
    handleUpdateLineItem(itemId, 'productId', product.id);
    handleUpdateLineItem(itemId, 'productName', `${product.name} - ${product.bundleId}`);
    setProductSearchTerms(prev => ({ ...prev, [itemId]: `${product.name} - ${product.bundleId}` }));
  };

  const getFilteredProducts = (searchTerm: string) => {
    if (!searchTerm || !products) return [];
    return products.filter((product: any) => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.bundleId.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10); // Limit to 10 results
  };

  const calculateSubtotal = () => {
    return quoteLineItems.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
  };

  const calculateProcessingFee = (subtotal: number) => {
    return ccProcessingFee ? subtotal * 0.035 : 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const processingFee = calculateProcessingFee(subtotal);
    return subtotal + processingFee;
  };

  const logVisitorVisit = async () => {
    if (!viewingClient) return;
    
    setIsLoggingVisit(true);
    try {
      const response = await fetch(`/api/clients/${viewingClient.id}/visit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to log visit');
      }
      
      const result = await response.json();
      
      toast({
        title: "Visit Logged Successfully",
        description: result.message,
      });
      
      // Close the modal
      setIsVisitorVisitModalOpen(false);
      
      // Refetch client activities to update activity history
      queryClient.invalidateQueries({ queryKey: ['/api/clients', viewingClient.id, 'activities'] });
      
    } catch (error) {
      console.error('Error logging visit:', error);
      toast({
        title: "Error",
        description: "Failed to log visitor visit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingVisit(false);
    }
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
  const handleEditQuote = async (quoteId: number) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`);
      if (!response.ok) throw new Error('Failed to fetch quote');
      const quote = await response.json();
      setEditingQuote(quote);
      setIsEditQuoteModalOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load quote for editing",
        variant: "destructive",
      });
    }
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
    
    setQuoteToDelete({ id: quoteId, name: quoteName });
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteQuote = () => {
    if (quoteToDelete) {
      deleteQuoteMutation.mutate(quoteToDelete.id);
      setIsDeleteConfirmOpen(false);
      setQuoteToDelete(null);
    }
  };

  const cancelDeleteQuote = () => {
    setIsDeleteConfirmOpen(false);
    setQuoteToDelete(null);
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
      toast({
        title: "AI Summary Generated",
        description: "Purchase history analysis complete",
      });
    } catch (error: any) {
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



  // Bulk import helper functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setBulkImportFile(file);
    parseCSVFile(file);
  };

  const parseCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "Invalid CSV",
          description: "CSV file must have at least a header row and one data row",
          variant: "destructive",
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1);
      
      const parsedData = rows.map((row, index) => {
        const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
        const client: any = { rowNumber: index + 2 };
        
        headers.forEach((header, i) => {
          const normalizedHeader = header.toLowerCase().replace(/\s+/g, '');
          switch (normalizedHeader) {
            case 'name':
            case 'clientname':
            case 'fullname':
              client.name = values[i] || '';
              break;
            case 'email':
            case 'emailaddress':
              client.email = values[i] || '';
              break;
            case 'phone':
            case 'phonenumber':
            case 'tel':
              client.phone = values[i] || '';
              break;
            case 'company':
            case 'companyname':
            case 'organization':
              client.company = values[i] || '';
              break;
            case 'address':
            case 'streetaddress':
              client.address = values[i] || '';
              break;
            case 'city':
              client.city = values[i] || '';
              break;
            case 'state':
            case 'province':
              client.state = values[i] || '';
              break;
            case 'zip':
            case 'zipcode':
            case 'postalcode':
              client.zipCode = values[i] || '';
              break;
            case 'notes':
            case 'comments':
              client.notes = values[i] || '';
              break;
            default:
              break;
          }
        });
        
        return client;
      });

      setImportPreview(parsedData);
    };
    
    reader.readAsText(file);
  };

  const handleBulkImport = () => {
    if (importPreview.length === 0) {
      toast({
        title: "No Data",
        description: "Please upload and preview data before importing",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingImport(true);
    bulkImportMutation.mutate(importPreview);
  };

  const handleCloseBulkImport = () => {
    setIsBulkImportModalOpen(false);
    setBulkImportFile(null);
    setImportPreview([]);
    setIsProcessingImport(false);
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      'Name,Email,Phone,Company,Address,City,State,Zip,Notes',
      'John Smith,john@example.com,555-0123,Acme Corp,123 Main St,Austin,TX,73301,VIP Client',
      'Jane Doe,jane@business.com,555-0456,Business Inc,456 Oak Ave,Dallas,TX,75201,Referred by partner'
    ].join('\n');

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'client-import-sample.csv';
    link.click();
    URL.revokeObjectURL(url);
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
            <div className="flex gap-2">
              <Dialog open={isBulkImportModalOpen} onOpenChange={setIsBulkImportModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload size={16} className="mr-2" />
                    Bulk Import
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Bulk Client Import</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* File Upload Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Upload CSV File</h3>
                        <Button variant="outline" size="sm" onClick={downloadSampleCSV}>
                          <FileText size={16} className="mr-2" />
                          Download Sample
                        </Button>
                      </div>
                      
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="csvUpload"
                        />
                        <label
                          htmlFor="csvUpload"
                          className="cursor-pointer flex flex-col items-center space-y-2"
                        >
                          <Upload size={48} className="text-gray-400" />
                          <div className="text-sm text-gray-600">
                            {bulkImportFile ? (
                              <span className="text-green-600">
                                File uploaded: {bulkImportFile.name}
                              </span>
                            ) : (
                              <span>
                                Click to upload CSV file or drag and drop
                              </span>
                            )}
                          </div>
                        </label>
                      </div>

                      <div className="text-xs text-gray-500">
                        <p><strong>Supported columns:</strong> Name, Email, Phone, Company, Address, City, State, Zip, Notes</p>
                        <p>Column headers are case-insensitive and flexible (e.g., "Email Address" or "Phone Number" work too)</p>
                      </div>
                    </div>

                    {/* Preview Section */}
                    {importPreview.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Preview ({importPreview.length} clients)</h3>
                        <div className="max-h-60 overflow-y-auto border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>City</TableHead>
                                <TableHead>State</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importPreview.slice(0, 10).map((client, index) => (
                                <TableRow key={index}>
                                  <TableCell>{client.name || '-'}</TableCell>
                                  <TableCell>{client.email || '-'}</TableCell>
                                  <TableCell>{client.phone || '-'}</TableCell>
                                  <TableCell>{client.company || '-'}</TableCell>
                                  <TableCell>{client.city || '-'}</TableCell>
                                  <TableCell>{client.state || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {importPreview.length > 10 && (
                            <div className="p-2 text-center text-sm text-gray-500">
                              ... and {importPreview.length - 10} more clients
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={handleCloseBulkImport}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleBulkImport} 
                        disabled={importPreview.length === 0 || isProcessingImport}
                      >
                        {isProcessingImport ? 'Importing...' : `Import ${importPreview.length} Clients`}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
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
                    <div>
                      <Label htmlFor="salesManagerId">Sales Manager</Label>
                      <Select 
                        value={formData.salesManagerId} 
                        onValueChange={(value) => setFormData({ ...formData, salesManagerId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a sales manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Sales Manager</SelectItem>
                          {Array.isArray(salesManagers) && salesManagers.map((manager: any) => (
                            <SelectItem key={manager.id} value={manager.id.toString()}>
                              {manager.firstName} {manager.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
            </div>
          </CardHeader>

          {/* Client Detail Modal */}
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <div className="flex justify-between items-center">
                  <DialogTitle>Client Details</DialogTitle>
                  {viewingClient && (
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setIsVisitorVisitModalOpen(true)}
                        className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-2"
                      >
                        <span className="text-lg">+</span>
                        Visitor Visit
                      </Button>
                      <Button 
                        onClick={() => {
                          handleOpenNewQuoteModal(viewingClient);
                        }}
                        className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
                      >
                        <span className="text-lg">+</span>
                        New Quote
                      </Button>
                    </div>
                  )}
                </div>
              </DialogHeader>
              {viewingClient && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="space-y-6 overflow-y-auto flex-1 pr-2 pb-4">
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

                  {/* AI Summary Section */}
                  {clientQuotes && clientQuotes.length > 0 && (
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-primary-custom">AI Purchase Summary</h3>
                        <Button 
                          onClick={() => generateAISummary(viewingClient)}
                          disabled={isGeneratingAI}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          {isGeneratingAI ? 'Generating...' : 'Generate AI Summary'}
                        </Button>
                      </div>
                      {aiSummary && (
                        <div className="bg-white rounded p-3 border">
                          <p className="text-sm text-gray-700">{aiSummary}</p>
                        </div>
                      )}
                      {!aiSummary && !isGeneratingAI && (
                        <p className="text-sm text-gray-600 italic">Click "Generate AI Summary" to analyze this client's purchase patterns and preferences.</p>
                      )}
                    </div>
                  )}

                  {/* Activity History */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="text-lg font-semibold text-primary-custom mb-4">Activity History</h3>
                    {clientActivities && clientActivities.length > 0 ? (
                      <div className="space-y-3">
                        {clientActivities.map((activity: any) => (
                          <div key={activity.id} className="flex items-start gap-3 p-3 bg-white rounded border">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              activity.type === 'quote' 
                                ? activity.status === 'approved' 
                                  ? 'bg-green-500' 
                                  : activity.status === 'rejected' 
                                    ? 'bg-red-500' 
                                    : 'bg-blue-500'
                                : activity.type === 'store_visit' 
                                  ? 'bg-purple-500' 
                                  : 'bg-gray-500'
                            }`}></div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-medium text-sm">{activity.description}</p>
                                <span className="text-xs text-gray-500">
                                  {new Date(activity.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {activity.details}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-sm text-gray-500">No activity history available</p>
                      </div>
                    )}
                  </div>

                  {/* Purchase History */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-primary-custom">Purchase History</h3>
                      {clientQuotes && clientQuotes.length > 0 && (
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total Amount</p>
                          <p className="text-lg font-semibold text-primary-custom">
                            ${clientQuotes.reduce((total: number, quote: any) => total + parseFloat(quote.totalAmount || quote.subtotal || 0), 0).toLocaleString()}
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
                                <span className="font-medium">${parseFloat(quote.totalAmount || quote.subtotal || 0).toLocaleString()}</span>
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
                  </div>

                  <div className="flex justify-end pt-4 border-t mt-4">
                    <Button onClick={handleCloseViewModal} variant="outline">Close</Button>
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
                          <div className="text-right space-y-2 bg-gray-50 p-4 rounded-lg min-w-[250px]">
                            <div className="flex justify-between text-sm">
                              <span>Subtotal:</span>
                              <span>${parseFloat(viewingQuote.subtotal || 0).toLocaleString()}</span>
                            </div>
                            {viewingQuote.processingFee && parseFloat(viewingQuote.processingFee) > 0 && (
                              <div className="flex justify-between text-sm">
                                <span>Processing Fee (3.5%):</span>
                                <span>${parseFloat(viewingQuote.processingFee).toLocaleString()}</span>
                              </div>
                            )}
                            {viewingQuote.taxAmount && parseFloat(viewingQuote.taxAmount) > 0 && (
                              <div className="flex justify-between text-sm">
                                <span>Tax ({parseFloat(viewingQuote.taxRate || 0) * 100}%):</span>
                                <span>${parseFloat(viewingQuote.taxAmount).toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-lg font-semibold border-t pt-2">
                              <span>Total:</span>
                              <span>${parseFloat(viewingQuote.totalAmount || viewingQuote.subtotal || 0).toLocaleString()}</span>
                            </div>
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

          {/* Delete Confirmation Modal */}
          <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Quote</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {quoteToDelete && (
                  <p>Are you sure you want to delete quote {quoteToDelete.name}?</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={cancelDeleteQuote}
                  disabled={deleteQuoteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteQuote}
                  disabled={deleteQuoteMutation.isPending}
                >
                  {deleteQuoteMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* New Quote Modal */}
          <Dialog open={isNewQuoteModalOpen} onOpenChange={setIsNewQuoteModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Quote</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                createQuoteMutation.mutate(quoteFormData);
              }} className="space-y-4">
                {/* Client Information Display */}
                {viewingClient && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Client</h4>
                    <p className="font-semibold">{viewingClient.name}</p>
                    <p className="text-sm text-gray-600">{viewingClient.email}</p>
                    {viewingClient.company && (
                      <p className="text-sm text-gray-600">{viewingClient.company}</p>
                    )}
                  </div>
                )}

                {/* Project Name */}
                <div>
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    value={quoteFormData.projectName}
                    onChange={(e) => setQuoteFormData(prev => ({
                      ...prev,
                      projectName: e.target.value
                    }))}
                    placeholder="Enter project name"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={quoteFormData.description}
                    onChange={(e) => setQuoteFormData(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                    placeholder="Enter project description"
                  />
                </div>

                {/* Valid Until */}
                <div>
                  <Label htmlFor="validUntil">Quote Valid Until *</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={quoteFormData.validUntil || ""}
                    onChange={(e) => setQuoteFormData(prev => ({
                      ...prev,
                      validUntil: e.target.value
                    }))}
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={quoteFormData.status}
                    onChange={(e) => setQuoteFormData(prev => ({
                      ...prev,
                      status: e.target.value
                    }))}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Line Items */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <Label>Quote Items</Label>
                    <Button
                      type="button"
                      onClick={handleAddLineItem}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1"
                    >
                      Add Item
                    </Button>
                  </div>
                  
                  {quoteLineItems.length > 0 ? (
                    <div className="space-y-3 border rounded-lg p-3">
                      {quoteLineItems.map((item: any) => (
                        <div key={item.id} className="flex gap-2 items-end">
                          <div className="flex-1 relative">
                            <Label className="text-xs">Product</Label>
                            <Input
                              type="text"
                              placeholder="Search products..."
                              value={productSearchTerms[item.id] || ""}
                              onChange={(e) => handleProductSearch(item.id, e.target.value)}
                              className="text-sm h-8"
                            />
                            {productSearchTerms[item.id] && getFilteredProducts(productSearchTerms[item.id]).length > 0 && (
                              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                                {getFilteredProducts(productSearchTerms[item.id]).map((product: any) => (
                                  <div
                                    key={product.id}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                    onClick={() => handleSelectProduct(item.id, product)}
                                  >
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-gray-500 text-xs">{product.bundleId}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="w-20">
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="text-sm h-8"
                            />
                          </div>
                          <div className="w-24">
                            <Label className="text-xs">Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="text-sm h-8"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveLineItem(item.id)}
                            className="text-red-600 hover:text-red-800 h-8 w-8 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-sm text-gray-500">No items added yet</p>
                      <p className="text-xs text-gray-400">Click "Add Item" to get started</p>
                    </div>
                  )}
                  
                  {quoteLineItems.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {/* Credit Card Processing Fee Toggle */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="ccProcessingFee"
                            checked={ccProcessingFee}
                            onChange={(e) => setCcProcessingFee(e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <Label htmlFor="ccProcessingFee" className="text-sm font-medium cursor-pointer">
                            Credit Card Processing Fee (3.5%)
                          </Label>
                        </div>
                        {ccProcessingFee && (
                          <span className="text-sm text-gray-600">
                            +${calculateProcessingFee(calculateSubtotal()).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Total Calculation */}
                      <div className="border-t pt-3">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>${calculateSubtotal().toFixed(2)}</span>
                        </div>
                        {ccProcessingFee && (
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Processing Fee (3.5%):</span>
                            <span>${calculateProcessingFee(calculateSubtotal()).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-semibold mt-2 pt-2 border-t">
                          <span>Total:</span>
                          <span>${calculateTotal().toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewQuoteModalOpen(false)}
                    disabled={createQuoteMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={createQuoteMutation.isPending}
                  >
                    {createQuoteMutation.isPending ? "Creating..." : "Create Quote"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Quote Modal */}
          <QuoteBuilderModal 
            isOpen={isEditQuoteModalOpen}
            onClose={() => setIsEditQuoteModalOpen(false)}
            editQuote={editingQuote}
          />

          {/* Visitor Visit Confirmation Modal */}
          <Dialog open={isVisitorVisitModalOpen} onOpenChange={setIsVisitorVisitModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Log Store Visit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to log a store visit for <strong>{viewingClient?.name}</strong>?
                </p>
                <p className="text-xs text-gray-500">
                  This will record the current date and time ({new Date().toLocaleString()}) in the client's activity history.
                </p>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsVisitorVisitModalOpen(false)}
                    disabled={isLoggingVisit}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={logVisitorVisit}
                    disabled={isLoggingVisit}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    {isLoggingVisit ? "Logging..." : "Confirm Visit"}
                  </Button>
                </div>
              </div>
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
                    <TableHead>Sales Manager</TableHead>
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
                        {client.salesManager ? (
                          <span className="text-sm">
                            {client.salesManager.firstName} {client.salesManager.lastName}
                          </span>
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
