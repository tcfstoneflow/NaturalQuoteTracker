import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download,
  Eye,
  Settings,
  Database,
  Users,
  Package
} from "lucide-react";

interface PreviewData {
  success: boolean;
  tableType?: string;
  headers?: string[];
  totalRows?: number;
  previewRows?: any[];
  fieldMapping?: {
    isValid: boolean;
    missingFields: string[];
    mapping: Record<string, string>;
  };
  validationSummary?: {
    isValid: boolean;
    errorCount: number;
    errors: string[];
  };
  suggestedMappings?: any;
  filename?: string;
  fileSize?: number;
  error?: string;
}

interface ImportResult {
  message: string;
  imported: number;
  failed: number;
  tableType: string;
  errors?: Array<{ row: number; error: string; data: any }>;
  totalErrors?: number;
}

export default function BulkImport() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSettings, setImportSettings] = useState({
    skipErrors: false,
    batchSize: 100
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      
      const response = await apiRequest('POST', '/api/admin/bulk-import-preview', formData);
      return response.json();
    },
    onSuccess: (data: PreviewData) => {
      setPreviewData(data);
      setIsPreviewModalOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Preview Failed",
        description: error.message || "Failed to preview CSV file",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async ({ file, settings }: { file: File; settings: any }) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      formData.append('skipErrors', settings.skipErrors.toString());
      formData.append('batchSize', settings.batchSize.toString());
      
      const response = await apiRequest('POST', '/api/admin/bulk-import-csv', formData);
      return response.json();
    },
    onSuccess: (data: ImportResult) => {
      setImportResult(data);
      setIsImportModalOpen(false);
      
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/slabs'] });
      
      toast({
        title: "Import Completed",
        description: `Successfully imported ${data.imported} records${data.failed > 0 ? `, ${data.failed} failed` : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import CSV file",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast({
          title: "Invalid File",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      setPreviewData(null);
      setImportResult(null);
    }
  };

  const handlePreview = () => {
    if (selectedFile) {
      previewMutation.mutate(selectedFile);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      setIsImportModalOpen(true);
    }
  };

  const confirmImport = () => {
    if (selectedFile) {
      importMutation.mutate({ 
        file: selectedFile, 
        settings: importSettings 
      });
    }
  };

  const downloadSampleCSV = (type: string) => {
    let sampleData = '';
    
    switch (type) {
      case 'products':
        sampleData = [
          'Name,Supplier,Category,Grade,Thickness,Finish,Price,BundleId,Description,Unit,StockQuantity,SlabLength,SlabWidth,Location',
          'Carrara White,Marble Masters,marble,premium,3cm,polished,89.50,CAR-001,Premium Italian Carrara marble,sqft,25,120,75,Warehouse A',
          'Black Galaxy,Stone World,granite,standard,2cm,honed,65.00,BG-002,Black granite with gold speckles,sqft,18,110,68,Warehouse B'
        ].join('\n');
        break;
      case 'clients':
        sampleData = [
          'Name,Email,Phone,Company,Address,City,State,ZipCode,Notes',
          'John Smith,john@example.com,555-0123,Acme Corp,123 Main St,Austin,TX,73301,VIP Client',
          'Jane Doe,jane@business.com,555-0456,Business Inc,456 Oak Ave,Dallas,TX,75201,Referred by partner'
        ].join('\n');
        break;
      case 'slabs':
        sampleData = [
          'BundleId,SlabNumber,Status,Length,Width,Location,Notes',
          'CAR-001,S001,available,120,75,Warehouse A,Perfect condition',
          'CAR-001,S002,available,118,74,Warehouse A,Minor edge chip'
        ].join('\n');
        break;
    }

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-import-sample.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTableTypeIcon = (type: string) => {
    switch (type) {
      case 'products': return <Package className="h-4 w-4" />;
      case 'clients': return <Users className="h-4 w-4" />;
      case 'slabs': return <Database className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getValidationBadge = (isValid: boolean, errorCount: number) => {
    if (isValid) {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Valid</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{errorCount} Error{errorCount !== 1 ? 's' : ''}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Import</h1>
          <p className="text-muted-foreground">
            Import products, clients, or slabs from CSV files with preview and validation
          </p>
        </div>
      </div>

      {/* Sample Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Sample Templates
          </CardTitle>
          <CardDescription>
            Get started with these sample CSV templates for your data imports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={() => downloadSampleCSV('products')}
              className="h-20 flex flex-col gap-2"
            >
              <Package className="h-6 w-6" />
              <span>Products Template</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => downloadSampleCSV('clients')}
              className="h-20 flex flex-col gap-2"
            >
              <Users className="h-6 w-6" />
              <span>Clients Template</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => downloadSampleCSV('slabs')}
              className="h-20 flex flex-col gap-2"
            >
              <Database className="h-6 w-6" />
              <span>Slabs Template</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CSV File
          </CardTitle>
          <CardDescription>
            Select a CSV file to preview and import your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csvUpload"
            />
            <label
              htmlFor="csvUpload"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              <Upload size={48} className="text-gray-400" />
              <div className="text-sm text-gray-600">
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-green-600 font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <span>Click to upload CSV file or drag and drop</span>
                )}
              </div>
            </label>
          </div>

          {selectedFile && (
            <div className="flex gap-2">
              <Button 
                onClick={handlePreview}
                disabled={previewMutation.isPending}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                {previewMutation.isPending ? 'Analyzing...' : 'Preview & Validate'}
              </Button>
              
              <Button 
                onClick={handleImport}
                disabled={!previewData?.success || importMutation.isPending}
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                {importMutation.isPending ? 'Importing...' : 'Import Data'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                <div className="text-sm text-green-800">Records Imported</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                <div className="text-sm text-red-800">Records Failed</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{importResult.tableType}</div>
                <div className="text-sm text-blue-800">Table Type</div>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-800">Import Errors:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {importResult.errors.map((error, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Row {error.row}: {error.error}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
                {importResult.totalErrors && importResult.totalErrors > importResult.errors.length && (
                  <p className="text-sm text-gray-600">
                    ... and {importResult.totalErrors - importResult.errors.length} more errors
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              CSV Preview & Validation
            </DialogTitle>
            <DialogDescription>
              Review your data before importing
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-6">
              {previewData.success ? (
                <>
                  {/* File Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold">{previewData.totalRows}</div>
                      <div className="text-sm text-gray-600">Total Rows</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold">{previewData.headers?.length}</div>
                      <div className="text-sm text-gray-600">Columns</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-center gap-1">
                        {getTableTypeIcon(previewData.tableType || '')}
                        <span className="text-lg font-bold capitalize">{previewData.tableType}</span>
                      </div>
                      <div className="text-sm text-gray-600">Table Type</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold">
                        {((previewData.fileSize || 0) / 1024).toFixed(1)} KB
                      </div>
                      <div className="text-sm text-gray-600">File Size</div>
                    </div>
                  </div>

                  {/* Validation Status */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Validation Status:</span>
                      {previewData.validationSummary && 
                        getValidationBadge(
                          previewData.validationSummary.isValid, 
                          previewData.validationSummary.errorCount
                        )
                      }
                    </div>
                    {previewData.fieldMapping && !previewData.fieldMapping.isValid && (
                      <Badge variant="destructive">
                        Missing: {previewData.fieldMapping.missingFields.join(', ')}
                      </Badge>
                    )}
                  </div>

                  {/* Validation Errors */}
                  {previewData.validationSummary && 
                   previewData.validationSummary.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-800">Validation Errors:</h4>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {previewData.validationSummary.errors.map((error, index) => (
                          <Alert key={index} variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-sm">{error}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data Preview */}
                  <Tabs defaultValue="preview" className="w-full">
                    <TabsList>
                      <TabsTrigger value="preview">Data Preview</TabsTrigger>
                      <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="preview" className="space-y-4">
                      <div className="border rounded-lg overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {previewData.headers?.map((header, index) => (
                                <TableHead key={index} className="whitespace-nowrap">
                                  {header}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.previewRows?.map((row, index) => (
                              <TableRow key={index}>
                                {previewData.headers?.map((header, colIndex) => (
                                  <TableCell key={colIndex} className="max-w-32 truncate">
                                    {row[header] || ''}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="text-sm text-gray-600">
                        Showing first 10 rows of {previewData.totalRows} total rows
                      </p>
                    </TabsContent>
                    
                    <TabsContent value="mapping">
                      <div className="space-y-4">
                        <h4 className="font-medium">Field Mapping</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {previewData.fieldMapping && 
                           Object.entries(previewData.fieldMapping.mapping).map(([field, header]) => (
                            <div key={field} className="flex justify-between items-center p-2 border rounded">
                              <span className="font-medium">{field}</span>
                              <span className="text-gray-600">{header}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {previewData.error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Settings Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Import Settings
            </DialogTitle>
            <DialogDescription>
              Configure how the import should be processed
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skipErrors"
                  checked={importSettings.skipErrors}
                  onCheckedChange={(checked) => 
                    setImportSettings(prev => ({ ...prev, skipErrors: !!checked }))
                  }
                />
                <Label htmlFor="skipErrors" className="text-sm font-medium">
                  Skip errors and continue import
                </Label>
              </div>
              <p className="text-xs text-gray-600 ml-6">
                When enabled, rows with errors will be skipped and the rest will be imported. 
                When disabled, the entire import will fail if any row has errors.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batchSize" className="text-sm font-medium">
                Batch Size
              </Label>
              <Input
                id="batchSize"
                type="number"
                min="10"
                max="1000"
                value={importSettings.batchSize}
                onChange={(e) => 
                  setImportSettings(prev => ({ 
                    ...prev, 
                    batchSize: parseInt(e.target.value) || 100 
                  }))
                }
              />
              <p className="text-xs text-gray-600">
                Number of rows to process in each batch (10-1000). Smaller batches use less memory.
              </p>
            </div>

            {previewData?.success && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Import Summary</h4>
                <div className="space-y-1 text-sm">
                  <p>File: {previewData.filename}</p>
                  <p>Table: {previewData.tableType}</p>
                  <p>Total Rows: {previewData.totalRows}</p>
                  <p>Estimated Batches: {Math.ceil((previewData.totalRows || 0) / importSettings.batchSize)}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmImport}
                disabled={importMutation.isPending}
                className="flex items-center gap-2"
              >
                {importMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Start Import
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}