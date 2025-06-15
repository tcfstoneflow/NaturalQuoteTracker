import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, User, Package, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface PipelineItem {
  id: number;
  cartId: number;
  cartName: string;
  clientId: number;
  clientName: string;
  stage: string;
  priority: string;
  estimatedCompletionDate: string | null;
  actualCompletionDate: string | null;
  notes: string | null;
  assignedUserId: number | null;
  assignedUserName: string | null;
  createdAt: string;
  updatedAt: string;
}

const STAGES = [
  { value: "quote", label: "Quote", color: "bg-blue-100 text-blue-800" },
  { value: "approved", label: "Approved", color: "bg-green-100 text-green-800" },
  { value: "production", label: "Production", color: "bg-yellow-100 text-yellow-800" },
  { value: "delivery", label: "Delivery", color: "bg-purple-100 text-purple-800" },
  { value: "completed", label: "Completed", color: "bg-gray-100 text-gray-800" }
];

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-800" },
  { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-800" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-800" }
];

export default function Pipeline() {
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [editingItem, setEditingItem] = useState<PipelineItem | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pipelineItems = [], isLoading } = useQuery({
    queryKey: ["/api/pipeline"],
    queryFn: () => apiRequest("GET", "/api/pipeline").then(res => res.json())
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => apiRequest("GET", "/api/users").then(res => res.json())
  });

  const updatePipelineMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/pipeline/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline"] });
      toast({ title: "Pipeline item updated successfully" });
      setEditingItem(null);
    },
    onError: () => {
      toast({ title: "Failed to update pipeline item", variant: "destructive" });
    }
  });

  const getStageColor = (stage: string) => {
    return STAGES.find(s => s.value === stage)?.color || "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority: string) => {
    return PRIORITIES.find(p => p.value === priority)?.color || "bg-gray-100 text-gray-800";
  };

  const filteredItems = pipelineItems.filter((item: PipelineItem) => {
    const stageMatch = selectedStage === "all" || item.stage === selectedStage;
    const priorityMatch = selectedPriority === "all" || item.priority === selectedPriority;
    return stageMatch && priorityMatch;
  });

  const handleUpdateItem = (data: any) => {
    if (!editingItem) return;
    updatePipelineMutation.mutate({ id: editingItem.id, data });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sales Pipeline</h1>
        <div className="flex gap-4">
          <Select value={selectedStage} onValueChange={setSelectedStage}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map(stage => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {PRIORITIES.map(priority => (
                <SelectItem key={priority.value} value={priority.value}>
                  {priority.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pipeline items</h3>
              <p className="text-gray-500">No items match the current filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-3 text-left font-medium">Cart ID</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-medium">Cart Name</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-medium">Client</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-medium">Stage</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-medium">Priority</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-medium">Assigned To</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-medium">Est. Completion</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item: PipelineItem) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3 font-mono">{item.cartId}</td>
                    <td className="border border-gray-300 px-4 py-3 font-medium">{item.cartName}</td>
                    <td className="border border-gray-300 px-4 py-3">{item.clientName}</td>
                    <td className="border border-gray-300 px-4 py-3">
                      <Badge className={getStageColor(item.stage)}>
                        {STAGES.find(s => s.value === item.stage)?.label || item.stage}
                      </Badge>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <Badge className={getPriorityColor(item.priority)}>
                        {PRIORITIES.find(p => p.value === item.priority)?.label || item.priority}
                      </Badge>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      {item.assignedUserName ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {item.assignedUserName}
                        </div>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      {item.estimatedCompletionDate ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(item.estimatedCompletionDate), "MMM dd, yyyy")}
                        </div>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingItem(item)}
                          >
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit Pipeline Item</DialogTitle>
                          </DialogHeader>
                          <EditPipelineForm 
                            item={editingItem} 
                            users={users}
                            onSubmit={handleUpdateItem}
                            onCancel={() => setEditingItem(null)}
                          />
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EditPipelineForm({ 
  item, 
  users, 
  onSubmit, 
  onCancel 
}: { 
  item: PipelineItem | null; 
  users: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    stage: item?.stage || "quote",
    priority: item?.priority || "medium",
    assignedUserId: item?.assignedUserId?.toString() || "",
    estimatedCompletionDate: item?.estimatedCompletionDate ? 
      new Date(item.estimatedCompletionDate).toISOString().split('T')[0] : "",
    notes: item?.notes || ""
  });

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      stage: formData.stage,
      priority: formData.priority,
      assignedUserId: formData.assignedUserId ? parseInt(formData.assignedUserId) : null,
      estimatedCompletionDate: formData.estimatedCompletionDate || null,
      notes: formData.notes || null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="stage">Stage</Label>
        <Select value={formData.stage} onValueChange={(value) => setFormData({...formData, stage: value})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map(stage => (
              <SelectItem key={stage.value} value={stage.value}>
                {stage.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="priority">Priority</Label>
        <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map(priority => (
              <SelectItem key={priority.value} value={priority.value}>
                {priority.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="assignedUserId">Assigned To</Label>
        <Select value={formData.assignedUserId} onValueChange={(value) => setFormData({...formData, assignedUserId: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Select user" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Unassigned</SelectItem>
            {users.map(user => (
              <SelectItem key={user.id} value={user.id.toString()}>
                {user.firstName} {user.lastName} ({user.username})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="estimatedCompletionDate">Estimated Completion Date</Label>
        <Input
          type="date"
          value={formData.estimatedCompletionDate}
          onChange={(e) => setFormData({...formData, estimatedCompletionDate: e.target.value})}
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Add notes about this pipeline item..."
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit">Update</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}