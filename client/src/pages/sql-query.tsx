import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { aiApi } from "@/lib/api";
import { Wand2, Copy, Play, AlertCircle, Database, Lightbulb, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SQLQuery() {
  const [naturalQuery, setNaturalQuery] = useState("");
  const [generatedQuery, setGeneratedQuery] = useState("");
  const [queryExplanation, setQueryExplanation] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [resultsAnalysis, setResultsAnalysis] = useState("");
  const { toast } = useToast();

  const translateMutation = useMutation({
    mutationFn: aiApi.translateQuery,
    onSuccess: (data) => {
      setGeneratedQuery(data.query);
      setQueryExplanation(data.explanation);
      setConfidence(data.confidence);
      setWarnings(data.warnings || []);
      setQueryResults([]);
      setResultsAnalysis("");
    },
    onError: (error: any) => {
      toast({
        title: "Translation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const executeMutation = useMutation({
    mutationFn: aiApi.executeSQL,
    onSuccess: (data) => {
      setQueryResults(data.results);
      setResultsAnalysis(data.analysis);
      toast({
        title: "Query Executed",
        description: `Retrieved ${data.rowCount} rows`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Execution Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTranslateQuery = () => {
    if (!naturalQuery.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a question about your data",
        variant: "destructive",
      });
      return;
    }
    translateMutation.mutate(naturalQuery);
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(generatedQuery);
    toast({
      title: "Copied",
      description: "SQL query copied to clipboard",
    });
  };

  const handleExecuteQuery = () => {
    if (!generatedQuery.trim()) {
      toast({
        title: "No Query",
        description: "Please generate a SQL query first",
        variant: "destructive",
      });
      return;
    }
    executeMutation.mutate(generatedQuery);
  };

  const exampleQueries = [
    "Show me all clients who have spent more than $20,000 total",
    "List the top 5 best-selling products by quantity sold",
    "Find all pending quotes that expire within the next 7 days",
    "Show me monthly revenue trends for the last 6 months",
    "Which clients have not received any quotes this year?",
    "List all marble products that are low in stock (less than 10 units)",
  ];

  const schemaInfo = [
    {
      table: "clients",
      description: "Customer information and contact details",
      columns: ["id", "name", "email", "phone", "company", "address", "city", "state", "zip_code", "notes", "created_at"]
    },
    {
      table: "products", 
      description: "Natural stone products and inventory",
      columns: ["id", "name", "category", "grade", "thickness", "price", "unit", "stock_quantity", "description", "is_active", "created_at"]
    },
    {
      table: "quotes",
      description: "Customer quotes and pricing information", 
      columns: ["id", "quote_number", "client_id", "project_name", "status", "subtotal", "tax_rate", "tax_amount", "total_amount", "valid_until", "notes", "sent_at", "created_at", "updated_at"]
    },
    {
      table: "quote_line_items",
      description: "Individual items within each quote",
      columns: ["id", "quote_id", "product_id", "quantity", "unit_price", "total_price", "notes"]
    },
    {
      table: "activities",
      description: "System activity log and audit trail", 
      columns: ["id", "type", "description", "entity_type", "entity_id", "metadata", "created_at"]
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="SQL Query Tool" 
        subtitle="Use natural language to query your business data"
      />
      
      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50-custom">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Query Interface */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Query Assistant */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wand2 className="text-primary" size={20} />
                  <span>AI Query Assistant</span>
                  <Badge variant="secondary" className="ml-2">BETA</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-custom mb-2">
                    Ask a question about your data:
                  </label>
                  <Textarea
                    value={naturalQuery}
                    onChange={(e) => setNaturalQuery(e.target.value)}
                    placeholder="e.g., Show me all clients who purchased granite in the last 3 months with order value over $10,000"
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <Button 
                  onClick={handleTranslateQuery}
                  disabled={translateMutation.isPending}
                  className="w-full"
                >
                  <Wand2 size={16} className="mr-2" />
                  {translateMutation.isPending ? "Generating..." : "Generate SQL Query"}
                </Button>

                {generatedQuery && (
                  <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-secondary-custom">Generated SQL:</span>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={handleCopySQL}>
                          <Copy size={14} className="mr-1" />
                          Copy
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleExecuteQuery}
                          disabled={executeMutation.isPending}
                        >
                          <Play size={14} className="mr-1" />
                          {executeMutation.isPending ? "Running..." : "Execute"}
                        </Button>
                      </div>
                    </div>
                    <div className="bg-white rounded border p-3 font-mono text-sm text-primary-custom overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{generatedQuery}</pre>
                    </div>
                    
                    {queryExplanation && (
                      <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-primary">
                        <div className="flex items-start space-x-2">
                          <Lightbulb size={16} className="text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-primary-custom">{queryExplanation}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-secondary-custom">
                                Confidence: {Math.round(confidence * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {warnings.length > 0 && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded border-l-4 border-warning-orange">
                        <div className="flex items-start space-x-2">
                          <AlertCircle size={16} className="text-warning-orange mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-primary-custom">Warnings:</p>
                            <ul className="text-sm text-secondary-custom list-disc list-inside">
                              {warnings.map((warning, index) => (
                                <li key={index}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Query Results */}
            {queryResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database size={20} />
                    <span>Query Results</span>
                    <Badge variant="outline">{queryResults.length} rows</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {resultsAnalysis && (
                    <div className="mb-4 p-3 bg-green-50 rounded border-l-4 border-success-green">
                      <p className="text-sm text-primary-custom font-medium">Analysis:</p>
                      <p className="text-sm text-primary-custom">{resultsAnalysis}</p>
                    </div>
                  )}

                  <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-white sticky top-0 border-b">
                        <tr>
                          {Object.keys(queryResults[0] || {}).map((key) => (
                            <th key={key} className="text-left py-3 px-4 font-medium text-secondary-custom">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResults.slice(0, 100).map((row, index) => (
                          <tr key={index} className="border-b border-neutral-100 hover:bg-neutral-50">
                            {Object.values(row).map((value: any, colIndex) => (
                              <td key={colIndex} className="py-3 px-4 text-primary-custom">
                                {value?.toString() || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {queryResults.length > 100 && (
                      <p className="text-xs text-secondary-custom mt-2 p-3 text-center bg-neutral-50">
                        Showing first 100 of {queryResults.length} results
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Example Queries */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb size={20} />
                  <span>Example Queries</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {exampleQueries.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => setNaturalQuery(query)}
                      className="w-full text-left p-3 text-sm bg-neutral-50 hover:bg-neutral-100 rounded-lg border transition-colors"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Database Schema */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Code size={20} />
                  <span>Database Schema</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {schemaInfo.map((table, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <h4 className="font-medium text-primary-custom">{table.table}</h4>
                      <p className="text-xs text-secondary-custom mb-2">{table.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {table.columns.map((column, colIndex) => (
                          <Badge key={colIndex} variant="outline" className="text-xs">
                            {column}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
