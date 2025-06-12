import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Download, Edit, Trash2, Plus, Save, X, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
  createdAt: string;
}

interface BulkEditData {
  company?: string;
  city?: string;
  state?: string;
  notes?: string;
}

export default function BulkClientManager() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [bulkEditData, setBulkEditData] = useState<BulkEditData>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Check user authentication and role
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) return null;
      return response.json();
    },
  });

  const isAdmin = user?.user?.role === 'admin';

  // Fetch clients
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
  });

  // Import clients mutation
  const importMutation = useMutation({
    mutationFn: async (csvData: string) => {
      const response = await fetch('/api/clients/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csvData })
      });
      if (!response.ok) throw new Error('Import failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import Successful",
        description: `Imported ${data.imported} clients, ${data.updated} updated, ${data.failed} failed`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setImportDialogOpen(false);
      setCsvContent("");
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Bulk edit mutation
  const bulkEditMutation = useMutation({
    mutationFn: async ({ clientIds, updates }: { clientIds: number[], updates: BulkEditData }) => {
      const response = await fetch('/api/clients/bulk-edit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientIds, updates })
      });
      if (!response.ok) throw new Error('Bulk edit failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Edit Successful",
        description: `Updated ${data.updated} clients`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setBulkEditDialogOpen(false);
      setSelectedClients([]);
      setBulkEditData({});
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Edit Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Export clients to CSV
  const handleExport = () => {
    const csvHeaders = "Name,Email,Phone,Company,Address,City,State,Zip Code,Notes,Created At\n";
    const csvRows = clients.map((client: Client) => 
      `"${client.name}","${client.email}","${client.phone}","${client.company}","${client.address}","${client.city}","${client.state}","${client.zipCode}","${client.notes}","${client.createdAt}"`
    ).join('\n');
    
    const csvContent = csvHeaders + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export Successful",
      description: `Exported ${clients.length} clients to CSV`
    });
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCsvContent(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  // Handle client selection
  const handleClientSelect = (clientId: number, checked: boolean) => {
    if (checked) {
      setSelectedClients([...selectedClients, clientId]);
    } else {
      setSelectedClients(selectedClients.filter(id => id !== clientId));
    }
  };

  // Select all clients
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(clients.map((client: Client) => client.id));
    } else {
      setSelectedClients([]);
    }
  };

  // Handle bulk edit
  const handleBulkEdit = () => {
    if (selectedClients.length === 0) {
      toast({
        title: "No Clients Selected",
        description: "Please select clients to edit",
        variant: "destructive"
      });
      return;
    }

    // Filter out empty values
    const updates = Object.entries(bulkEditData).reduce((acc, [key, value]) => {
      if (value && value.trim() !== '') {
        acc[key as keyof BulkEditData] = value.trim();
      }
      return acc;
    }, {} as BulkEditData);

    if (Object.keys(updates).length === 0) {
      toast({
        title: "No Changes",
        description: "Please enter values to update",
        variant: "destructive"
      });
      return;
    }

    bulkEditMutation.mutate({ clientIds: selectedClients, updates });
  };

  if (isLoading) {
    return <div>Loading clients...</div>;
  }

  // Show access restricted message for non-admin users
  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span>Bulk Client Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Admin Access Required</h3>
            <p className="text-gray-600">
              Bulk client import, export, and editing operations are restricted to administrators only.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Bulk Client Management</span>
          <div className="flex gap-2">
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Import Clients from CSV</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>CSV Format</Label>
                    <p className="text-sm text-gray-600 mb-2">
                      Required headers: Name, Email, Phone, Company, Address, City, State, Zip Code, Notes
                    </p>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="mb-2"
                    />
                  </div>
                  <div>
                    <Label>CSV Content Preview</Label>
                    <Textarea
                      value={csvContent}
                      onChange={(e) => setCsvContent(e.target.value)}
                      placeholder="Paste CSV content here or upload a file..."
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setImportDialogOpen(false);
                        setCsvContent("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => importMutation.mutate(csvContent)}
                      disabled={!csvContent.trim() || importMutation.isPending}
                    >
                      {importMutation.isPending ? "Importing..." : "Import Clients"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>

            <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={selectedClients.length === 0}>
                  <Edit className="w-4 h-4 mr-2" />
                  Bulk Edit ({selectedClients.length})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Edit Clients</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Editing {selectedClients.length} selected clients. Only filled fields will be updated.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Company</Label>
                      <Input
                        value={bulkEditData.company || ""}
                        onChange={(e) => setBulkEditData({ ...bulkEditData, company: e.target.value })}
                        placeholder="Leave empty to skip"
                      />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input
                        value={bulkEditData.city || ""}
                        onChange={(e) => setBulkEditData({ ...bulkEditData, city: e.target.value })}
                        placeholder="Leave empty to skip"
                      />
                    </div>
                    <div>
                      <Label>State</Label>
                      <Input
                        value={bulkEditData.state || ""}
                        onChange={(e) => setBulkEditData({ ...bulkEditData, state: e.target.value })}
                        placeholder="Leave empty to skip"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={bulkEditData.notes || ""}
                      onChange={(e) => setBulkEditData({ ...bulkEditData, notes: e.target.value })}
                      placeholder="Leave empty to skip"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBulkEditDialogOpen(false);
                        setBulkEditData({});
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkEdit}
                      disabled={bulkEditMutation.isPending}
                    >
                      {bulkEditMutation.isPending ? "Updating..." : "Update Clients"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={selectedClients.length === clients.length && clients.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <Label>Select All ({clients.length} clients)</Label>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Select</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client: Client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={(checked) => handleClientSelect(client.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.company}</TableCell>
                  <TableCell>{client.city}</TableCell>
                  <TableCell>{client.state}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}