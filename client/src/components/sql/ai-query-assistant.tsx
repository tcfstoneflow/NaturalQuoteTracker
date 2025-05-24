import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { aiApi } from "@/lib/api";
import { Wand2, Copy, Play, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AIQueryAssistant() {
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

  return (
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
            rows={3}
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
            <code className="text-sm text-primary-custom font-mono block bg-white p-3 rounded border whitespace-pre-wrap">
              {generatedQuery}
            </code>
            
            {queryExplanation && (
              <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-primary">
                <p className="text-sm text-primary-custom">{queryExplanation}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-secondary-custom">
                    Confidence: {Math.round(confidence * 100)}%
                  </span>
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

        {queryResults.length > 0 && (
          <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50">
            <h4 className="text-sm font-medium text-primary-custom mb-3">
              Query Results ({queryResults.length} rows)
            </h4>
            
            {resultsAnalysis && (
              <div className="mb-3 p-3 bg-green-50 rounded border-l-4 border-success-green">
                <p className="text-sm text-primary-custom">{resultsAnalysis}</p>
              </div>
            )}

            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-white sticky top-0">
                  <tr className="border-b">
                    {Object.keys(queryResults[0] || {}).map((key) => (
                      <th key={key} className="text-left py-2 px-3 font-medium text-secondary-custom">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResults.slice(0, 50).map((row, index) => (
                    <tr key={index} className="border-b border-neutral-100">
                      {Object.values(row).map((value: any, colIndex) => (
                        <td key={colIndex} className="py-2 px-3 text-primary-custom">
                          {value?.toString() || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {queryResults.length > 50 && (
                <p className="text-xs text-secondary-custom mt-2 text-center">
                  Showing first 50 of {queryResults.length} results
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
