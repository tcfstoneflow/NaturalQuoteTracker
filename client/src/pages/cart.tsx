import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Plus, Trash2, Edit2, FileText, Users, Package, Calculator } from "lucide-react";
import { useLocation } from "wouter";

interface Cart {
  id: number;
  name: string;
  description: string | null;
  type: string;
  status: string;
  totalAmount: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: CartItem[];
}

interface CartItem {
  id: number;
  itemType: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  notes: string | null;
  product?: {
    id: number;
    name: string;
    category: string;
    bundleId: string;
    imageUrl: string;
  };
  slab?: {
    id: number;
    slabNumber: string;
    bundleId: string;
    length: number;
    width: number;
  };
}

interface Client {
  id: number;
  name: string;
  email: string;
  company: string | null;
}

export default function Cart() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedCart, setSelectedCart] = useState<Cart | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [newCartData, setNewCartData] = useState({
    name: "",
    description: "",
    type: "quote"
  });
  const [convertData, setConvertData] = useState({
    clientId: "",
    notes: ""
  });

  // Fetch user's carts
  const { data: carts = [], isLoading: cartsLoading } = useQuery({
    queryKey: ['/api/carts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/carts');
      return Array.isArray(response) ? response : [];
    },
  });

  // Fetch clients for quote conversion
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clients');
      return Array.isArray(response) ? response : [];
    },
  });

  // Fetch selected cart details
  const { data: cartDetails } = useQuery({
    queryKey: ['/api/carts', selectedCart?.id],
    queryFn: async () => {
      if (!selectedCart?.id) return null;
      return await apiRequest('GET', `/api/carts/${selectedCart.id}`);
    },
    enabled: !!selectedCart?.id,
  });

  // Create cart mutation
  const createCartMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/carts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/carts'] });
      toast({
        title: "Success",
        description: "Cart created successfully",
      });
      setIsCreating(false);
      setNewCartData({ name: "", description: "", type: "quote" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create cart",
        variant: "destructive",
      });
    },
  });

  // Delete cart mutation
  const deleteCartMutation = useMutation({
    mutationFn: (cartId: number) => apiRequest('DELETE', `/api/carts/${cartId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/carts'] });
      toast({
        title: "Success",
        description: "Cart deleted successfully",
      });
      if (selectedCart) {
        setSelectedCart(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete cart",
        variant: "destructive",
      });
    },
  });

  // Convert to quote mutation
  const convertToQuoteMutation = useMutation({
    mutationFn: ({ cartId, data }: { cartId: number; data: any }) => 
      apiRequest('POST', `/api/carts/${cartId}/convert-to-quote`, data),
    onSuccess: (quote) => {
      queryClient.invalidateQueries({ queryKey: ['/api/carts'] });
      toast({
        title: "Success",
        description: "Cart converted to quote successfully",
      });
      setIsConverting(false);
      setLocation(`/quotes`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to convert cart to quote",
        variant: "destructive",
      });
    },
  });

  const handleCreateCart = (e: React.FormEvent) => {
    e.preventDefault();
    createCartMutation.mutate(newCartData);
  };

  const handleDeleteCart = (cart: Cart) => {
    if (confirm(`Are you sure you want to delete "${cart.name}"?`)) {
      deleteCartMutation.mutate(cart.id);
    }
  };

  const handleConvertToQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCart || !convertData.clientId) return;

    convertToQuoteMutation.mutate({
      cartId: selectedCart.id,
      data: {
        clientId: parseInt(convertData.clientId),
        notes: convertData.notes
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'converted':
        return 'bg-blue-100 text-blue-800';
      case 'abandoned':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quote':
        return <FileText className="h-4 w-4" />;
      case 'order':
        return <Package className="h-4 w-4" />;
      default:
        return <ShoppingCart className="h-4 w-4" />;
    }
  };

  if (cartsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-lg font-medium">Loading carts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Cart Management</h1>
          <p className="text-muted-foreground">
            Manage your carts and convert them to quotes
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Cart
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Cart</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCart} className="space-y-4">
              <div>
                <Label htmlFor="name">Cart Name *</Label>
                <Input
                  id="name"
                  value={newCartData.name}
                  onChange={(e) => setNewCartData({ ...newCartData, name: e.target.value })}
                  placeholder="e.g., Kitchen Renovation Project"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newCartData.description}
                  onChange={(e) => setNewCartData({ ...newCartData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={newCartData.type} onValueChange={(value) => setNewCartData({ ...newCartData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quote">Quote</SelectItem>
                    <SelectItem value="order">Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCartMutation.isPending}>
                  {createCartMutation.isPending ? "Creating..." : "Create Cart"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carts List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Your Carts ({carts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {carts.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No carts found</p>
                  <Button onClick={() => setIsCreating(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Cart
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {carts.map((cart: Cart) => (
                    <div
                      key={cart.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedCart?.id === cart.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedCart(cart)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center">
                          {getTypeIcon(cart.type)}
                          <h3 className="font-medium ml-2 truncate">{cart.name}</h3>
                        </div>
                        <Badge className={getStatusColor(cart.status)}>
                          {cart.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Total: ${parseFloat(cart.totalAmount).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(cart.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart Details */}
        <div className="lg:col-span-2">
          {selectedCart ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    {getTypeIcon(selectedCart.type)}
                    <span className="ml-2">{selectedCart.name}</span>
                    <Badge className={`ml-2 ${getStatusColor(selectedCart.status)}`}>
                      {selectedCart.status}
                    </Badge>
                  </CardTitle>
                  {selectedCart.description && (
                    <p className="text-muted-foreground mt-1">{selectedCart.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  {selectedCart.status === 'active' && (
                    <Dialog open={isConverting} onOpenChange={setIsConverting}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          Convert to Quote
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Convert Cart to Quote</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleConvertToQuote} className="space-y-4">
                          <div>
                            <Label htmlFor="client">Client *</Label>
                            <Select value={convertData.clientId} onValueChange={(value) => setConvertData({ ...convertData, clientId: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select client" />
                              </SelectTrigger>
                              <SelectContent>
                                {clients.map((client: Client) => (
                                  <SelectItem key={client.id} value={client.id.toString()}>
                                    {client.name} {client.company && `(${client.company})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="convertNotes">Notes</Label>
                            <Input
                              id="convertNotes"
                              value={convertData.notes}
                              onChange={(e) => setConvertData({ ...convertData, notes: e.target.value })}
                              placeholder="Optional notes for the quote"
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setIsConverting(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={convertToQuoteMutation.isPending || !convertData.clientId}>
                              {convertToQuoteMutation.isPending ? "Converting..." : "Convert to Quote"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteCart(selectedCart)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {cartDetails?.items?.length > 0 ? (
                  <div>
                    <h4 className="font-medium mb-4">Cart Items ({cartDetails.items.length})</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cartDetails.items.map((item: CartItem) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {item.product?.name || item.slab?.slabNumber || 'Unknown Item'}
                                </div>
                                {item.product?.bundleId && (
                                  <div className="text-sm text-muted-foreground">
                                    Bundle: {item.product.bundleId}
                                  </div>
                                )}
                                {item.slab && (
                                  <div className="text-sm text-muted-foreground">
                                    {item.slab.length}" × {item.slab.width}"
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {item.itemType === 'product' ? 'Product' : 'Slab'}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>${parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                            <TableCell>${parseFloat(item.totalPrice).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium">Total Amount:</span>
                        <span className="text-lg font-bold">${parseFloat(selectedCart.totalAmount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">This cart is empty</p>
                    <Button onClick={() => setLocation('/inventory')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Items from Inventory
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  Select a cart to view details
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose a cart from the list to see its contents and manage items
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}