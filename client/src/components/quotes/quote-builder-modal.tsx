import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { clientsApi, productsApi, quotesApi } from "@/lib/api";
import { Plus, Trash2, FileText, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface QuoteBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  editQuote?: any;
}

interface LineItem {
  productId: number;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  product?: any;
  slabId?: number;
  slab?: any;
  length?: string;
  width?: string;
  area?: string;
  subtotal?: string;
}

export default function QuoteBuilderModal({ isOpen, onClose, editQuote }: QuoteBuilderModalProps) {
  const [clientId, setClientId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [additionalMessage, setAdditionalMessage] = useState("");
  const [ccProcessingFee, setCcProcessingFee] = useState(false);
  const [salesRepId, setSalesRepId] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  
  // Ref for click outside detection
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  
  // Product search states
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  
  // Slab selection states
  const [availableSlabs, setAvailableSlabs] = useState<any[]>([]);
  const [selectedSlabId, setSelectedSlabId] = useState<number | null>(null);
  const [isSlabDropdownOpen, setIsSlabDropdownOpen] = useState(false);
  const slabDropdownRef = useRef<HTMLDivElement>(null);
  
  // New client creation state
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: ""
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch clients and products
  const { data: clientsData } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: () => clientsApi.getAll(),
  });

  // Ensure clients is always an array
  const clients = Array.isArray(clientsData) ? clientsData : [];

  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    queryFn: productsApi.getAll,
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch slabs data
  const { data: slabs } = useQuery({
    queryKey: ['/api/slabs'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Function to handle product selection
  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    setProductSearchQuery(product.name);
    setIsProductDropdownOpen(false);
    
    // Filter available slabs based on product's bundleId
    if (slabs && product.bundleId) {
      const matchingSlabs = slabs.filter((slab: any) => 
        slab.bundleId === product.bundleId && slab.status === 'available'
      );
      setAvailableSlabs(matchingSlabs);
    }
    
    // Reset slab selection
    setSelectedSlabId(null);
  };

  // Function to handle slab selection
  const handleSlabSelect = (slab: any) => {
    setSelectedSlabId(slab.id);
    setIsSlabDropdownOpen(false);
  };

  // Function to add selected product and slab to quote
  const addSelectedItemToQuote = () => {
    if (!selectedProduct || !selectedSlabId) return;
    
    const selectedSlab = availableSlabs.find(slab => slab.id === selectedSlabId);
    if (!selectedSlab) return;
    
    const length = parseFloat(selectedSlab.length || 0);
    const width = parseFloat(selectedSlab.width || 0);
    const price = parseFloat(selectedProduct.price || 0);
    
    // Calculate subtotal using formula: ((length × width) / 12) × price
    const subtotal = ((length * width) / 12) * price;
    
    const newLineItem: LineItem = {
      productId: selectedProduct.id,
      quantity: "1",
      unitPrice: price.toString(),
      totalPrice: subtotal.toString(),
      product: selectedProduct,
      slabId: selectedSlab.id,
      slab: selectedSlab,
      length: length.toString(),
      width: width.toString(),
      area: ((length * width) / 144).toString(), // Convert to sq ft
      subtotal: subtotal.toString()
    };
    
    setLineItems([...lineItems, newLineItem]);
    
    // Reset selections
    setSelectedProduct(null);
    setProductSearchQuery("");
    setSelectedSlabId(null);
    setAvailableSlabs([]);
  };

  // Set form data or populate with edit data
  useEffect(() => {
    if (isOpen) {
      if (editQuote) {
        // Populate form with existing quote data
        setClientId(editQuote.clientId?.toString() || "");
        setProjectName(editQuote.projectName || "");
        setNotes(editQuote.notes || "");
        
        // Set client search query to show selected client
        if (editQuote.client) {
          setClientSearchQuery(editQuote.client.company ? `${editQuote.client.company} - ${editQuote.client.name}` : editQuote.client.name);
        }
        
        // Populate line items
        const existingLineItems = editQuote.lineItems?.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          product: item.product
        })) || [];
        setLineItems(existingLineItems);
        
        // Set processing fee checkbox based on existing quote data
        setCcProcessingFee(editQuote.processingFee && parseFloat(editQuote.processingFee) > 0);
        
        // Set sales rep assignment
        setSalesRepId(editQuote.salesRepId?.toString() || "");
      } else {
        // Reset form for new quote
        setClientId("");
        setClientSearchQuery("");
        setProjectName("");
        setNotes("");
        setLineItems([]);
        setProductSearchQuery("");
        setIsProductDropdownOpen(false);
        setSelectedProduct(null);
        setSelectedSlabId(null);
        setAvailableSlabs([]);
        
        // Pre-populate sales rep field with current user
        if (user?.id) {
          setSalesRepId(user.id.toString());
        } else {
          setSalesRepId("");
        }

      }
    }
  }, [isOpen, editQuote, user]);

  // Click outside handler for client dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    };

    if (isClientDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isClientDropdownOpen]);

  // Click outside handler for product dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    };

    if (isProductDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProductDropdownOpen]);

  // Click outside handler for slab dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (slabDropdownRef.current && !slabDropdownRef.current.contains(event.target as Node)) {
        setIsSlabDropdownOpen(false);
      }
    };

    if (isSlabDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSlabDropdownOpen]);

  const createQuoteMutation = useMutation({
    mutationFn: quotesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales-dashboard/my-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales-dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales-dashboard/recent-activities'] });
      toast({
        title: "Quote Created",
        description: "Quote has been saved as draft",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateQuoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => quotesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-quotes'] });
      toast({
        title: "Quote Updated",
        description: "Quote has been successfully updated",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendQuoteMutation = useMutation({
    mutationFn: ({ quoteId, message }: { quoteId: number; message?: string }) => 
      quotesApi.sendEmail(quoteId, message),
    onSuccess: () => {
      toast({
        title: "Quote Sent",
        description: "Quote has been sent to the client",
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

  const createClientMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: (newClient: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setClientId(newClient.id.toString());
      setIsNewClientModalOpen(false);
      setNewClientData({
        name: "",
        email: "",
        phone: "",
        company: "",
        address: ""
      });
      toast({
        title: "Client Created",
        description: "New client has been created and selected",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client",
        variant: "destructive",
      });
    },
  });

  const addLineItem = () => {
    setLineItems([...lineItems, {
      productId: 0,
      quantity: "1",
      unitPrice: "",
      totalPrice: "0",
    }]);
  };

  const addProductToQuote = (product: any) => {
    // Find the first available slab that matches this product
    const matchingSlab = slabs?.find((slab: any) => 
      slab.bundleId === product.bundleId && 
      slab.isActive && 
      slab.status === 'available'
    );

    let unitPrice = parseFloat(product.price || "0");
    let length = "";
    let width = "";
    let area = "";

    if (matchingSlab) {
      // Use slab dimensions for area calculation
      const slabLength = parseFloat(matchingSlab.length || "0");
      const slabWidth = parseFloat(matchingSlab.width || "0");
      
      if (slabLength > 0 && slabWidth > 0) {
        // Calculate area in square feet (assuming dimensions are in inches)
        const areaInSqFt = (slabLength * slabWidth) / 144;
        
        // Calculate total price as price per sqft × area
        unitPrice = parseFloat(product.price || "0") * areaInSqFt;
        
        length = slabLength.toString();
        width = slabWidth.toString();
        area = areaInSqFt.toFixed(2);
      }
    }

    const newItem = {
      productId: product.id,
      quantity: "1",
      unitPrice: unitPrice.toFixed(2),
      totalPrice: unitPrice.toFixed(2),
      product: product,
      slabId: matchingSlab?.id,
      slab: matchingSlab,
      length: length,
      width: width,
      area: area,
    };
    
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Calculate total price when quantity, unit price, length, or width changes
    if (field === 'quantity' || field === 'unitPrice' || field === 'length' || field === 'width') {
      const quantity = parseFloat(field === 'quantity' ? value : updated[index].quantity) || 0;
      let unitPrice = parseFloat(field === 'unitPrice' ? value : updated[index].unitPrice) || 0;
      
      // If length or width changed, recalculate unit price based on area
      if (field === 'length' || field === 'width') {
        const length = parseFloat(field === 'length' ? value : updated[index].length || "0");
        const width = parseFloat(field === 'width' ? value : updated[index].width || "0");
        
        if (length > 0 && width > 0 && updated[index].product) {
          const areaInSqFt = (length * width) / 144;
          const pricePerSqFt = parseFloat(updated[index].product.price || "0");
          unitPrice = pricePerSqFt * areaInSqFt;
          
          updated[index].unitPrice = unitPrice.toFixed(2);
          updated[index].area = areaInSqFt.toFixed(2);
        }
      }
      
      updated[index].totalPrice = (quantity * unitPrice).toFixed(2);
    }

    // Update unit price and slab selection when product changes
    if (field === 'productId') {
      const product = products?.find((p: any) => p.id === parseInt(value));
      if (product) {
        // Find the first available slab that matches this product
        const matchingSlab = slabs?.find((slab: any) => 
          slab.bundleId === product.bundleId && 
          slab.isActive && 
          slab.status === 'available'
        );

        let unitPrice = parseFloat(product.price || "0");
        let length = "";
        let width = "";
        let area = "";

        if (matchingSlab) {
          const slabLength = parseFloat(matchingSlab.length || "0");
          const slabWidth = parseFloat(matchingSlab.width || "0");
          
          if (slabLength > 0 && slabWidth > 0) {
            const areaInSqFt = (slabLength * slabWidth) / 144;
            unitPrice = parseFloat(product.price || "0") * areaInSqFt;
            
            length = slabLength.toString();
            width = slabWidth.toString();
            area = areaInSqFt.toFixed(2);
          }
        }
        
        updated[index].unitPrice = unitPrice.toFixed(2);
        updated[index].product = product;
        updated[index].slabId = matchingSlab?.id;
        updated[index].slab = matchingSlab;
        updated[index].length = length;
        updated[index].width = width;
        updated[index].area = area;
        
        const quantity = parseFloat(updated[index].quantity) || 0;
        updated[index].totalPrice = (quantity * unitPrice).toFixed(2);
      }
    }

    setLineItems(updated);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + parseFloat(item.totalPrice || "0"), 0);
    const taxRate = 0.085; // 8.5%
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    return {
      subtotal: subtotal.toFixed(2),
      taxRate: taxRate.toFixed(4),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
    };
  };

  const handleSaveQuote = async (sendEmail = false) => {
    if (!clientId || !projectName || lineItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields and add at least one line item",
        variant: "destructive",
      });
      return;
    }

    const totals = calculateTotals();
    
    const quoteData = {
      clientId: parseInt(clientId),
      projectName,
      notes,
      subtotal: totals.subtotal,
      taxRate: totals.taxRate,
      taxAmount: totals.taxAmount,
      totalAmount: totals.total,
      salesRepId: salesRepId === "none" || !salesRepId ? null : parseInt(salesRepId),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    };

    const quoteLineItems = lineItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

    try {
      let quote;
      
      if (editQuote) {
        // Update existing quote
        quote = await updateQuoteMutation.mutateAsync({
          id: editQuote.id,
          data: {
            quote: quoteData,
            lineItems: quoteLineItems
          }
        });
      } else {
        // Create new quote
        quote = await createQuoteMutation.mutateAsync({ 
          quote: quoteData, 
          lineItems: quoteLineItems 
        });
      }

      if (sendEmail && quote) {
        await sendQuoteMutation.mutateAsync({ 
          quoteId: quote.id, 
          message: additionalMessage 
        });
      }
    } catch (error) {
      // Error handling is done in mutation callbacks
    }
  };

  const handleClose = () => {
    setClientId("");
    setClientSearchQuery("");
    setProjectName("");
    setNotes("");
    setLineItems([]);
    setAdditionalMessage("");
    setProductSearchQuery("");
    setIsClientDropdownOpen(false);
    setIsProductDropdownOpen(false);
    setIsSlabDropdownOpen(false);
    setSelectedProduct(null);
    setSelectedSlabId(null);
    setAvailableSlabs([]);
    onClose();
  };

  const totals = calculateTotals();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {editQuote ? "Edit Quote" : "Create New Quote"}
            </DialogTitle>
          </DialogHeader>

        <div className="space-y-6">
          {/* Client Selection and Project Details */}
          <div className="grid grid-cols-1 gap-6">
            <div className="relative" ref={clientDropdownRef}>
              <Label htmlFor="client">Select Client *</Label>
              <div className="relative">
                <Input
                  placeholder="Search for a client..."
                  value={clientSearchQuery}
                  onChange={(e) => {
                    setClientSearchQuery(e.target.value);
                    setIsClientDropdownOpen(true);
                  }}
                  onFocus={() => setIsClientDropdownOpen(true)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ▼
                </button>
                
                {isClientDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {(() => {
                      const filteredClients = clients?.filter((client: any) => {
                        const searchTerm = clientSearchQuery.toLowerCase();
                        return (
                          client.name?.toLowerCase().includes(searchTerm) ||
                          client.company?.toLowerCase().includes(searchTerm) ||
                          client.email?.toLowerCase().includes(searchTerm)
                        );
                      }) || [];

                      if (filteredClients.length === 0) {
                        return (
                          <div
                            onClick={() => {
                              setIsNewClientModalOpen(true);
                              setIsClientDropdownOpen(false);
                            }}
                            className="px-4 py-3 text-blue-600 font-medium cursor-pointer hover:bg-blue-50 border-b"
                          >
                            + Create New Client
                          </div>
                        );
                      }

                      return (
                        <>
                          <div
                            onClick={() => {
                              setIsNewClientModalOpen(true);
                              setIsClientDropdownOpen(false);
                            }}
                            className="px-4 py-3 text-blue-600 font-medium cursor-pointer hover:bg-blue-50 border-b"
                          >
                            + Create New Client
                          </div>
                          {filteredClients.map((client: any) => (
                            <div
                              key={client.id}
                              onClick={() => {
                                setClientId(client.id.toString());
                                setClientSearchQuery(client.company ? `${client.company} - ${client.name}` : client.name);
                                setIsClientDropdownOpen(false);
                              }}
                              className="px-4 py-3 cursor-pointer hover:bg-gray-50"
                            >
                              <div className="font-medium">
                                {client.company ? `${client.company} - ${client.name}` : client.name}
                              </div>
                              <div className="text-sm text-gray-500">{client.email}</div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="projectName">Project Name *</Label>
            <Input
              id="projectName"
              placeholder="e.g., Kitchen Renovation - Granite Countertops"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>



          {/* Product Search and Slab Selection */}
          <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold text-primary-custom">Add Products to Quote</h3>
            
            {/* Product Search */}
            <div className="relative" ref={productDropdownRef}>
              <Label>Search Product by Name</Label>
              <div className="relative">
                <Input
                  placeholder="Search products..."
                  value={productSearchQuery}
                  onChange={(e) => {
                    setProductSearchQuery(e.target.value);
                    setIsProductDropdownOpen(true);
                  }}
                  onFocus={() => setIsProductDropdownOpen(true)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ▼
                </button>
                
                {isProductDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {(() => {
                      const filteredProducts = Array.isArray(products) ? products.filter((product: any) => {
                        const searchTerm = productSearchQuery.toLowerCase();
                        return (
                          product.name?.toLowerCase().includes(searchTerm) ||
                          product.bundleId?.toLowerCase().includes(searchTerm) ||
                          product.description?.toLowerCase().includes(searchTerm)
                        );
                      }) : [];

                      if (filteredProducts.length === 0) {
                        return (
                          <div className="px-4 py-3 text-gray-500">
                            No products found
                          </div>
                        );
                      }

                      return filteredProducts.map((product: any) => (
                        <div
                          key={product.id}
                          onClick={() => handleProductSelect(product)}
                          className="px-4 py-3 cursor-pointer hover:bg-gray-50"
                        >
                          <div className="font-medium">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Bundle: {product.bundleId} | ${product.price} | {product.description}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Slab Selection */}
            {selectedProduct && (
              <div className="relative" ref={slabDropdownRef}>
                <Label>Select Available Slab</Label>
                <div className="relative">
                  <Input
                    placeholder="Select a slab..."
                    value={selectedSlabId ? availableSlabs.find(s => s.id === selectedSlabId)?.slabNumber || "" : ""}
                    readOnly
                    onClick={() => setIsSlabDropdownOpen(!isSlabDropdownOpen)}
                    className="cursor-pointer pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setIsSlabDropdownOpen(!isSlabDropdownOpen)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ▼
                  </button>
                  
                  {isSlabDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {availableSlabs.length === 0 ? (
                        <div className="px-4 py-3 text-gray-500">
                          No available slabs for this product
                        </div>
                      ) : (
                        availableSlabs.map((slab: any) => (
                          <div
                            key={slab.id}
                            onClick={() => handleSlabSelect(slab)}
                            className="px-4 py-3 cursor-pointer hover:bg-gray-50"
                          >
                            <div className="font-medium">
                              Slab #{slab.slabNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {slab.length}"L × {slab.width}"W | Location: {slab.location}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Add to Quote Button */}
            {selectedProduct && selectedSlabId && (
              <Button 
                onClick={addSelectedItemToQuote}
                className="bg-accent-orange hover:bg-accent-orange text-white w-full"
              >
                <Plus size={16} className="mr-2" />
                Add Selected Item to Quote
              </Button>
            )}
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary-custom">Quote Items</h3>
            </div>

            {lineItems.map((item, index) => (
              <Card key={index} className="mb-4">
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {/* Slab Information Display */}
                    {item.slab && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="font-semibold">Product:</span> {item.product?.name}
                          </div>
                          <div>
                            <span className="font-semibold">Slab:</span> #{item.slab.slabNumber}
                          </div>
                          <div>
                            <span className="font-semibold">Price:</span> ${item.unitPrice}/sq ft
                          </div>
                          <div>
                            <span className="font-semibold">Location:</span> {item.slab.location}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-2">
                          <div>
                            <span className="font-semibold">Length:</span> {item.length || 0}"
                          </div>
                          <div>
                            <span className="font-semibold">Width:</span> {item.width || 0}"
                          </div>
                          <div>
                            <span className="font-semibold">Area:</span> {item.area || 0} sq ft
                          </div>
                          <div>
                            <span className="font-semibold text-green-600">Subtotal:</span> ${item.subtotal || item.totalPrice}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Remove Item Button */}
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                        className="text-error-red hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>



          {/* Quote Summary */}
          <Card className="bg-neutral-50-custom">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-secondary-custom">
                  <span>Subtotal:</span>
                  <span>${totals.subtotal}</span>
                </div>

                <div className="flex justify-between text-secondary-custom">
                  <span>Tax (8.5%):</span>
                  <span>${totals.taxAmount}</span>
                </div>
                <div className="border-t border-neutral-200 pt-2">
                  <div className="flex justify-between text-lg font-bold text-primary-custom">
                    <span>Total:</span>
                    <span>${totals.total}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Message for Email */}
          <div>
            <Label htmlFor="additionalMessage">Additional Message (for email)</Label>
            <Textarea
              id="additionalMessage"
              placeholder="Optional message to include when sending the quote..."
              value={additionalMessage}
              onChange={(e) => setAdditionalMessage(e.target.value)}
              rows={3}
            />
          </div>



          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => handleSaveQuote(false)}
              disabled={createQuoteMutation.isPending}
            >
              <FileText size={16} className="mr-2" />
              Save as Draft
            </Button>
            <Button 
              className="flex-1 bg-accent-orange hover:bg-accent-orange text-white"
              onClick={() => handleSaveQuote(true)}
              disabled={createQuoteMutation.isPending || sendQuoteMutation.isPending}
            >
              <Send size={16} className="mr-2" />
              {sendQuoteMutation.isPending ? "Sending..." : "Save & Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Create New Client Modal */}
    <Dialog open={isNewClientModalOpen} onOpenChange={setIsNewClientModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Client</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="newClientName">Name *</Label>
            <Input
              id="newClientName"
              value={newClientData.name}
              onChange={(e) => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter client name"
            />
          </div>
          <div>
            <Label htmlFor="newClientEmail">Email *</Label>
            <Input
              id="newClientEmail"
              type="email"
              value={newClientData.email}
              onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email address"
            />
          </div>
          <div>
            <Label htmlFor="newClientPhone">Phone</Label>
            <Input
              id="newClientPhone"
              value={newClientData.phone}
              onChange={(e) => setNewClientData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter phone number"
            />
          </div>
          <div>
            <Label htmlFor="newClientCompany">Company</Label>
            <Input
              id="newClientCompany"
              value={newClientData.company}
              onChange={(e) => setNewClientData(prev => ({ ...prev, company: e.target.value }))}
              placeholder="Enter company name"
            />
          </div>
          <div>
            <Label htmlFor="newClientAddress">Address</Label>
            <Textarea
              id="newClientAddress"
              value={newClientData.address}
              onChange={(e) => setNewClientData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Enter address"
              rows={3}
            />
          </div>
          <div className="flex space-x-4 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setIsNewClientModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-accent-orange hover:bg-accent-orange text-white"
              onClick={() => createClientMutation.mutate(newClientData)}
              disabled={createClientMutation.isPending || !newClientData.name || !newClientData.email}
            >
              {createClientMutation.isPending ? "Creating..." : "Create Client"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
