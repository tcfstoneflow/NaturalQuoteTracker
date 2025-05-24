import { useState, useEffect } from "react";
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

interface QuoteBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LineItem {
  productId: number;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  product?: any;
}

export default function QuoteBuilderModal({ isOpen, onClose }: QuoteBuilderModalProps) {
  const [clientId, setClientId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [additionalMessage, setAdditionalMessage] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch clients and products
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: () => clientsApi.getAll(),
  });

  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    queryFn: productsApi.getAll,
  });

  // Set default valid until date (30 days from now)
  useEffect(() => {
    if (isOpen) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setValidUntil(defaultDate.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const createQuoteMutation = useMutation({
    mutationFn: quotesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-quotes'] });
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

  const addLineItem = () => {
    setLineItems([...lineItems, {
      productId: 0,
      quantity: "",
      unitPrice: "",
      totalPrice: "0",
    }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Calculate total price when quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = parseFloat(field === 'quantity' ? value : updated[index].quantity) || 0;
      const unitPrice = parseFloat(field === 'unitPrice' ? value : updated[index].unitPrice) || 0;
      updated[index].totalPrice = (quantity * unitPrice).toFixed(2);
    }

    // Update unit price when product changes
    if (field === 'productId') {
      const product = products?.find(p => p.id === parseInt(value));
      if (product) {
        // Calculate unit price as: (slab length in inches × slab width in inches ÷ 144) × price per sqft
        let unitPrice = parseFloat(product.price);
        if (product.slabLength && product.slabWidth) {
          const slabSqFt = (parseFloat(product.slabLength) * parseFloat(product.slabWidth)) / 144;
          unitPrice = slabSqFt * parseFloat(product.price);
        }
        
        updated[index].unitPrice = unitPrice.toFixed(2);
        updated[index].product = product;
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
    if (!clientId || !projectName || !validUntil || lineItems.length === 0) {
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
      validUntil: validUntil,
      notes,
      subtotal: totals.subtotal,
      taxRate: totals.taxRate,
      taxAmount: totals.taxAmount,
      totalAmount: totals.total,
    };

    const quoteLineItems = lineItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

    try {
      const quote = await createQuoteMutation.mutateAsync({ 
        quote: quoteData, 
        lineItems: quoteLineItems 
      });

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
    setProjectName("");
    setValidUntil("");
    setNotes("");
    setLineItems([]);
    setAdditionalMessage("");
    onClose();
  };

  const totals = calculateTotals();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary">Create New Quote</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Selection and Project Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="client">Select Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.company ? `${client.company} - ${client.name}` : client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="validUntil">Quote Valid Until *</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
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

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary-custom">Quote Items</h3>
              <Button onClick={addLineItem} className="bg-accent-orange hover:bg-accent-orange text-white">
                <Plus size={16} className="mr-2" />
                Add Item
              </Button>
            </div>

            {lineItems.map((item, index) => (
              <Card key={index} className="mb-4">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2">
                      <Label>Product *</Label>
                      <Select
                        value={item.productId.toString()}
                        onValueChange={(value) => updateLineItem(index, 'productId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.map((product: any) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} - {product.thickness}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quantity (slabs) *</Label>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Price Per Slab *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                        readOnly={item.product && item.product.slabLength && item.product.slabWidth}
                      />
                    </div>
                    <div className="flex flex-col">
                      <Label>Total: ${item.totalPrice}</Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(index)}
                        className="text-error-red hover:bg-red-50 mt-auto"
                      >
                        <Trash2 size={16} />
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
  );
}
