import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  Database, 
  Zap, 
  Trash2, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Upload,
  GitBranch,
  Play,
  Pause,
  Square
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface HealthReport {
  systemHealth: 'healthy' | 'warning' | 'critical';
  databaseHealth: 'healthy' | 'warning' | 'critical';
  performanceScore: number;
  storageUsage: number;
  activeConnections: number;
  lastBackup: string | null;
  recommendations: string[];
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    table?: string;
  }>;
  metrics: {
    totalProducts: number;
    totalQuotes: number;
    totalClients: number;
    avgResponseTime: number;
  };
}

interface ValidationResult {
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    table?: string;
  }>;
  fixed: Array<{
    type: string;
    message: string;
  }>;
  totalChecked: number;
}

export default function SystemHealth() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const { data: healthReport, isLoading: healthLoading, refetch: refetchHealth } = useQuery<HealthReport>({
    queryKey: ["/api/admin/health-report"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/validate-database");
      return await res.json();
    },
    onSuccess: (data: ValidationResult) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/health-report"] });
      toast({
        title: "Database Validation Complete",
        description: `Checked ${data.totalChecked} records. Found ${data.issues.length} issues, fixed ${data.fixed.length}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Validation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const optimizeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/optimize-quotes");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/health-report"] });
      toast({
        title: "Optimization Complete",
        description: "Quote calculations have been optimized.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Optimization Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/cleanup-data");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/health-report"] });
      toast({
        title: "Cleanup Complete",
        description: "Expired data has been cleaned up.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cleanup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const csvImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      // Force table type to products for stone slab bundles
      formData.append('tableType', 'products');
      const res = await apiRequest("POST", "/api/admin/bulk-import-csv", formData);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/health-report"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] }); // Refresh inventory
      toast({
        title: "Stone Slab Bundles Import Complete",
        description: `Successfully imported ${data.imported} stone slab bundles. ${data.failed || 0} failed.`,
      });
      setCsvFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Stone Slab Bundle Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Warning</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Critical</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (healthLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading system health...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">System Health Dashboard</h1>
          <p className="text-muted-foreground">Monitor and maintain your CRM system</p>
        </div>
        <Button onClick={() => refetchHealth()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {healthReport && getHealthBadge(healthReport.systemHealth)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Health</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {healthReport && getHealthBadge(healthReport.databaseHealth)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthReport?.performanceScore || 0}%</div>
                <Progress value={healthReport?.performanceScore || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthReport?.activeConnections || 0}</div>
                <p className="text-xs text-muted-foreground">Database connections</p>
              </CardContent>
            </Card>
          </div>

          {healthReport?.recommendations && healthReport.recommendations.length > 0 && (
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">System Recommendations:</div>
                <ul className="list-disc list-inside space-y-1">
                  {healthReport.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm">{rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {healthReport?.issues && healthReport.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>System Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {healthReport.issues.map((issue, index) => (
                    <Alert key={index} variant={issue.type === 'error' ? 'destructive' : 'default'}>
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <span>{issue.message}</span>
                          {issue.table && (
                            <Badge variant="outline" className="ml-2">{issue.table}</Badge>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="maintenance">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Database Validation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Check data integrity and fix inconsistencies
                </p>
                <Button 
                  onClick={() => validateMutation.mutate()}
                  disabled={validateMutation.isPending}
                  className="w-full"
                >
                  {validateMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4 mr-2" />
                  )}
                  Validate Database
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Optimize Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Optimize quote calculations and improve performance
                </p>
                <Button 
                  onClick={() => optimizeMutation.mutate()}
                  disabled={optimizeMutation.isPending}
                  className="w-full"
                >
                  {optimizeMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Optimize System
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trash2 className="w-5 h-5 mr-2" />
                  Data Cleanup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Remove expired data and clean up storage
                </p>
                <Button 
                  onClick={() => cleanupMutation.mutate()}
                  disabled={cleanupMutation.isPending}
                  variant="destructive"
                  className="w-full"
                >
                  {cleanupMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Clean Up Data
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Stone Slab Bundle Import
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Import multiple stone slab bundles to inventory from CSV file. Required headers: name, supplier, category, grade, thickness, finish, price. Optional: bundleId, description, slabLength, slabWidth, location, stockQuantity.
                </p>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <Button 
                    onClick={() => csvFile && csvImportMutation.mutate(csvFile)}
                    disabled={!csvFile || csvImportMutation.isPending}
                    className="w-full"
                  >
                    {csvImportMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Import Stone Slab Bundles
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics">
          {healthReport?.metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{healthReport.metrics.totalProducts}</div>
                  <p className="text-sm text-muted-foreground">Items in inventory</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Quotes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{healthReport.metrics.totalQuotes}</div>
                  <p className="text-sm text-muted-foreground">Generated quotes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Clients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{healthReport.metrics.totalClients}</div>
                  <p className="text-sm text-muted-foreground">Registered clients</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Avg Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{healthReport.metrics.avgResponseTime}ms</div>
                  <p className="text-sm text-muted-foreground">API response time</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="specs">
          <div className="space-y-4">
            {/* System Specs content will be added here */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}