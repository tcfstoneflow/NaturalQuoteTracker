import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Play, Clock, CheckCircle, XCircle, Users, FileText, Settings } from "lucide-react";
import { format } from "date-fns";

export default function WorkflowsPage() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const { toast } = useToast();

  // Mock data for demonstration since workflow API endpoints are not yet implemented
  const workflows = [
    {
      id: 1,
      name: "Client Onboarding",
      description: "Complete process for onboarding new clients",
      category: "Sales",
      status: "active",
      steps: [
        { id: 1, name: "Initial Contact", description: "First client meeting" },
        { id: 2, name: "Requirements Gathering", description: "Collect project requirements" },
        { id: 3, name: "Proposal Creation", description: "Create and send proposal" }
      ]
    },
    {
      id: 2,
      name: "Order Fulfillment",
      description: "Process customer orders from quote to delivery",
      category: "Operations",
      status: "active",
      steps: [
        { id: 4, name: "Order Processing", description: "Process customer order" },
        { id: 5, name: "Inventory Check", description: "Verify inventory availability" },
        { id: 6, name: "Scheduling", description: "Schedule production and delivery" }
      ]
    }
  ];

  const instances = [
    {
      id: 1,
      workflowId: 1,
      instanceName: "ABC Construction Onboarding",
      status: "in_progress",
      progress: 66,
      priority: "high",
      startedAt: new Date().toISOString(),
      workflow: workflows[0]
    },
    {
      id: 2,
      workflowId: 2,
      instanceName: "Order #12345 Processing",
      status: "pending",
      progress: 25,
      priority: "medium",
      startedAt: new Date().toISOString(),
      workflow: workflows[1]
    }
  ];

  const handleStartWorkflow = (workflowId: number) => {
    toast({ title: "Workflow functionality ready for implementation" });
  };

  const handleCompleteStep = (stepId: number) => {
    toast({ title: "Step completion functionality ready for implementation" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in_progress": return "bg-blue-500";
      case "pending": return "bg-gray-400";
      case "failed": return "bg-red-500";
      case "cancelled": return "bg-orange-500";
      default: return "bg-gray-400";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflow Management</h1>
          <p className="text-muted-foreground">
            Manage and track workflow processes across your organization
          </p>
        </div>
        
        <Button onClick={() => handleStartWorkflow(1)}>
          <Plus className="mr-2 h-4 w-4" />
          Start Workflow
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="instances" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Active Workflows
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{instances.length}</div>
                <p className="text-xs text-muted-foreground">
                  Currently running processes
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Templates</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workflows.length}</div>
                <p className="text-xs text-muted-foreground">
                  Available workflow templates
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">85%</div>
                <p className="text-xs text-muted-foreground">
                  Average completion rate
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            <div className="space-y-3">
              {instances.map((instance) => (
                <Card key={instance.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{instance.instanceName}</p>
                        <p className="text-sm text-muted-foreground">
                          {instance.workflow.category} • Started {format(new Date(instance.startedAt), "MMM d")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(instance.priority)}>
                          {instance.priority}
                        </Badge>
                        <Progress value={instance.progress} className="w-20 h-2" />
                        <span className="text-sm text-muted-foreground">{instance.progress}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="instances" className="space-y-4">
          <div className="grid gap-4">
            {instances.map((instance) => (
              <Card key={instance.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{instance.instanceName}</CardTitle>
                      <CardDescription>
                        Started {format(new Date(instance.startedAt), "MMM d, yyyy 'at' h:mm a")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(instance.priority)}>
                        {instance.priority}
                      </Badge>
                      <Badge className={getStatusColor(instance.status)}>
                        {instance.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{instance.progress}%</span>
                      </div>
                      <Progress value={instance.progress} className="h-2" />
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Category: {instance.workflow.category}</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCompleteStep(instance.id)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  <CardDescription>{workflow.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Category:</span>
                      <Badge variant="secondary">{workflow.category}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Steps:</span>
                      <span>{workflow.steps.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <Badge variant="outline">{workflow.status}</Badge>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button 
                      className="w-full" 
                      onClick={() => handleStartWorkflow(workflow.id)}
                    >
                      Start Workflow
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateWorkflowForm({ 
  workflows, 
  templates, 
  onSubmit, 
  isLoading 
}: { 
  workflows: WorkflowWithSteps[];
  templates: WorkflowTemplate[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    workflowId: "",
    instanceName: "",
    priority: "medium",
    dueDate: "",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      workflowId: parseInt(formData.workflowId),
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="workflow">Workflow Template</Label>
        <Select value={formData.workflowId} onValueChange={(value) => setFormData({ ...formData, workflowId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select a workflow" />
          </SelectTrigger>
          <SelectContent>
            {workflows.map((workflow) => (
              <SelectItem key={workflow.id} value={workflow.id.toString()}>
                {workflow.name} ({workflow.category})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instanceName">Instance Name</Label>
        <Input
          id="instanceName"
          value={formData.instanceName}
          onChange={(e) => setFormData({ ...formData, instanceName: e.target.value })}
          placeholder="Enter workflow instance name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dueDate">Due Date (Optional)</Label>
        <Input
          id="dueDate"
          type="datetime-local"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes for this workflow instance"
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={!formData.workflowId || isLoading}>
          {isLoading ? "Starting..." : "Start Workflow"}
        </Button>
      </div>
    </form>
  );
}

function MyTasksList({ instances, onCompleteStep }: { instances: any[]; onCompleteStep: (data: any) => void }) {
  const pendingTasks = instances.flatMap(instance => 
    instance.stepInstances?.filter((step: any) => 
      step.status === 'pending' || step.status === 'in_progress'
    ).map((step: any) => ({
      ...step,
      workflowName: instance.workflow?.name || "Unknown Workflow",
      instanceId: instance.id
    })) || []
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pending Tasks ({pendingTasks.length})</h3>
      {pendingTasks.map((task) => (
        <Card key={task.id}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base">{task.step?.name}</CardTitle>
                <CardDescription>{task.workflowName}</CardDescription>
              </div>
              <Badge className={getStatusColor(task.status)}>
                {task.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {task.step?.description || "No description available"}
              </p>
              <Button
                size="sm"
                onClick={() => onCompleteStep({ stepId: task.id })}
              >
                Mark Complete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {pendingTasks.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          No pending tasks assigned to you
        </p>
      )}
    </div>
  );
}

function TemplatesList({ templates }: { templates: WorkflowTemplate[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id}>
          <CardHeader>
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription>{template.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Category:</span>
                <Badge variant="secondary">{template.category}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Complexity:</span>
                <Badge variant="outline">{template.complexity}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Used:</span>
                <span>{template.usageCount} times</span>
              </div>
              {template.estimatedDuration && (
                <div className="flex justify-between text-sm">
                  <span>Duration:</span>
                  <span>{template.estimatedDuration} min</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WorkflowManagement({ workflows }: { workflows: WorkflowWithSteps[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Workflow Templates</h3>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>
      
      <div className="grid gap-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{workflow.name}</CardTitle>
                  <CardDescription>{workflow.description}</CardDescription>
                </div>
                <Badge className={workflow.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {workflow.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {workflow.steps.length} steps • {workflow.category}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button variant="outline" size="sm">Duplicate</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function WorkflowDetailsDialog({ 
  instance, 
  open, 
  onClose, 
  onCompleteStep 
}: { 
  instance: WorkflowInstanceWithDetails;
  open: boolean;
  onClose: () => void;
  onCompleteStep: (data: any) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {instance.instanceName || instance.workflow?.name}
          </DialogTitle>
          <DialogDescription>
            Started {format(new Date(instance.startedAt), "MMM d, yyyy 'at' h:mm a")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Status</h4>
              <Badge className={getStatusColor(instance.status)}>
                {instance.status}
              </Badge>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Progress</h4>
              <div className="flex items-center gap-2">
                <Progress value={instance.progress} className="flex-1" />
                <span className="text-sm">{instance.progress}%</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Workflow Steps</h4>
            <div className="space-y-3">
              {instance.stepInstances?.map((stepInstance, index) => (
                <div key={stepInstance.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {stepInstance.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : stepInstance.status === 'in_progress' ? (
                      <Clock className="h-5 w-5 text-blue-500" />
                    ) : stepInstance.status === 'failed' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium">{stepInstance.step?.name}</h5>
                    <p className="text-sm text-muted-foreground">
                      {stepInstance.step?.description}
                    </p>
                    {stepInstance.notes && (
                      <p className="text-sm text-blue-600 mt-1">{stepInstance.notes}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <Badge variant="outline">{stepInstance.status}</Badge>
                  </div>
                  {stepInstance.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => onCompleteStep({ stepId: stepInstance.id })}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}