import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Target, TrendingUp, DollarSign, FileText, Percent } from "lucide-react";

const salesTargetSchema = z.object({
  targetType: z.enum(["monthly", "quarterly"]),
  year: z.number().min(2024).max(2030),
  period: z.number().min(1),
  revenueTarget: z.string().min(1, "Revenue target is required"),
  quotesTarget: z.number().min(1, "Quotes target is required"),
  conversionTarget: z.string().min(1, "Conversion target is required"),
});

type SalesTargetFormData = z.infer<typeof salesTargetSchema>;

interface SalesTargetsModalProps {
  children: React.ReactNode;
}

interface TargetProgress {
  target: any;
  actual: {
    revenue: number;
    quotes: number;
    conversion: number;
  };
  progress: {
    revenue: number;
    quotes: number;
    conversion: number;
  };
}

interface TargetsProgressData {
  monthly?: TargetProgress;
  quarterly?: TargetProgress;
}

export default function SalesTargetsModal({ children }: SalesTargetsModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedTargetType, setSelectedTargetType] = useState<"monthly" | "quarterly">("monthly");

  const form = useForm<SalesTargetFormData>({
    resolver: zodResolver(salesTargetSchema),
    defaultValues: {
      targetType: "monthly",
      year: new Date().getFullYear(),
      period: 1,
      revenueTarget: "",
      quotesTarget: 10,
      conversionTarget: "25",
    },
  });

  // Get current targets and progress
  const { data: targetsProgress, isLoading } = useQuery<TargetsProgressData>({
    queryKey: ["/api/sales-targets/progress"],
    enabled: open,
    retry: 1,
  });

  // Get all targets for the user
  const { data: allTargets } = useQuery({
    queryKey: ["/api/sales-targets"],
    enabled: open,
  });

  // Create target mutation
  const createTargetMutation = useMutation({
    mutationFn: async (data: SalesTargetFormData) => {
      const response = await apiRequest("POST", "/api/sales-targets", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-targets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-targets/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-targets/current"] });
      form.reset();
      toast({
        title: "Sales target created",
        description: "Your sales target has been set successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create target",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SalesTargetFormData) => {
    // Validate period based on target type
    if (data.targetType === "monthly" && (data.period < 1 || data.period > 12)) {
      toast({
        title: "Invalid period",
        description: "Monthly targets must have a period between 1 and 12.",
        variant: "destructive",
      });
      return;
    }
    if (data.targetType === "quarterly" && (data.period < 1 || data.period > 4)) {
      toast({
        title: "Invalid period",
        description: "Quarterly targets must have a period between 1 and 4.",
        variant: "destructive",
      });
      return;
    }

    createTargetMutation.mutate(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-green-500";
    if (progress >= 75) return "bg-blue-500";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getProgressStatus = (progress: number) => {
    if (progress >= 100) return "Achieved";
    if (progress >= 75) return "On Track";
    if (progress >= 50) return "Needs Attention";
    return "Behind";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Sales Performance Goals & Targets</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Progress */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Progress</h3>
            
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-32 bg-gray-100 rounded animate-pulse" />
                <div className="h-32 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : targetsProgress && typeof targetsProgress === 'object' && Object.keys(targetsProgress).length > 0 ? (
              <div className="space-y-4">
                {/* Monthly Progress */}
                {(targetsProgress as any).monthly?.target && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>Monthly Target Progress</span>
                        <Badge variant={(targetsProgress as any).monthly.progress.revenue >= 100 ? "default" : "secondary"}>
                          {getProgressStatus((targetsProgress as any).monthly.progress.revenue)}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Revenue</span>
                          <span>{formatCurrency((targetsProgress as any).monthly.actual.revenue)} / {formatCurrency(parseFloat((targetsProgress as any).monthly.target.revenueTarget))}</span>
                        </div>
                        <Progress 
                          value={Math.min((targetsProgress as any).monthly.progress.revenue, 100)} 
                          className="h-2"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {(targetsProgress as any).monthly.progress.revenue.toFixed(1)}% complete
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Quotes</span>
                          <span>{(targetsProgress as any).monthly.actual.quotes} / {(targetsProgress as any).monthly.target.quotesTarget}</span>
                        </div>
                        <Progress 
                          value={Math.min((targetsProgress as any).monthly.progress.quotes, 100)} 
                          className="h-2"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {(targetsProgress as any).monthly.progress.quotes.toFixed(1)}% complete
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Conversion Rate</span>
                          <span>{(targetsProgress as any).monthly.actual.conversion.toFixed(1)}% / {parseFloat((targetsProgress as any).monthly.target.conversionTarget)}%</span>
                        </div>
                        <Progress 
                          value={Math.min((targetsProgress as any).monthly.progress.conversion, 100)} 
                          className="h-2"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {(targetsProgress as any).monthly.progress.conversion.toFixed(1)}% of target
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quarterly Progress */}
                {(targetsProgress as any).quarterly?.target && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>Quarterly Target Progress</span>
                        <Badge variant={(targetsProgress as any).quarterly.progress.revenue >= 100 ? "default" : "secondary"}>
                          {getProgressStatus((targetsProgress as any).quarterly.progress.revenue)}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Revenue</span>
                          <span>{formatCurrency((targetsProgress as any).quarterly.actual.revenue)} / {formatCurrency(parseFloat((targetsProgress as any).quarterly.target.revenueTarget))}</span>
                        </div>
                        <Progress 
                          value={Math.min((targetsProgress as any).quarterly.progress.revenue, 100)} 
                          className="h-2"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {(targetsProgress as any).quarterly.progress.revenue.toFixed(1)}% complete
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Quotes</span>
                          <span>{(targetsProgress as any).quarterly.actual.quotes} / {(targetsProgress as any).quarterly.target.quotesTarget}</span>
                        </div>
                        <Progress 
                          value={Math.min((targetsProgress as any).quarterly.progress.quotes, 100)} 
                          className="h-2"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {(targetsProgress as any).quarterly.progress.quotes.toFixed(1)}% complete
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Conversion Rate</span>
                          <span>{(targetsProgress as any).quarterly.actual.conversion.toFixed(1)}% / {parseFloat((targetsProgress as any).quarterly.target.conversionTarget)}%</span>
                        </div>
                        <Progress 
                          value={Math.min((targetsProgress as any).quarterly.progress.conversion, 100)} 
                          className="h-2"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {(targetsProgress as any).quarterly.progress.conversion.toFixed(1)}% of target
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!(targetsProgress as any).monthly?.target && !(targetsProgress as any).quarterly?.target && (
                  <Card>
                    <CardContent className="pt-6 text-center text-gray-500">
                      <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No sales targets set yet</p>
                      <p className="text-sm">Create your first target to start tracking progress</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Unable to load progress data</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Set New Target */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Set New Target</h3>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="targetType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Type</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedTargetType(value as "monthly" | "quarterly");
                          // Reset period when target type changes
                          form.setValue("period", 1);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select target type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="2024"
                            max="2030"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="period"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {selectedTargetType === "monthly" ? "Month" : "Quarter"}
                        </FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {selectedTargetType === "monthly" ? (
                              Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                </SelectItem>
                              ))
                            ) : (
                              Array.from({ length: 4 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  Q{i + 1}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="revenueTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4" />
                        <span>Revenue Target</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="50000"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quotesTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>Quotes Target</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="conversionTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-1">
                        <Percent className="h-4 w-4" />
                        <span>Conversion Rate Target (%)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="25"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createTargetMutation.isPending}
                >
                  {createTargetMutation.isPending ? "Creating..." : "Set Target"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}