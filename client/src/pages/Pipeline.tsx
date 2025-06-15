import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  DollarSign, 
  Calendar, 
  User, 
  Phone, 
  Mail,
  Building,
  Target,
  TrendingUp
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface PipelineItem {
  id: number;
  title: string;
  client?: {
    id: number;
    name: string;
    company?: string;
    email: string;
    phone?: string;
  };
  value?: number;
  stage: 'leads' | 'quotes' | 'closes';
  status: string;
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  lastActivity?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Pipeline() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createStage, setCreateStage] = useState<'leads' | 'quotes' | 'closes'>('leads');

  // Mock data for demonstration - in production this would come from API
  const mockPipelineData: PipelineItem[] = [
    {
      id: 1,
      title: "Kitchen Renovation - Marble Countertops",
      client: {
        id: 8,
        name: "John Smith",
        company: "Smith Residence",
        email: "john@example.com",
        phone: "(555) 123-4567"
      },
      value: 15000,
      stage: 'leads',
      status: 'new',
      priority: 'high',
      assignedTo: "sales_leader",
      lastActivity: "2025-06-14",
      notes: "Interested in Carrara marble for kitchen island",
      createdAt: "2025-06-10",
      updatedAt: "2025-06-14"
    },
    {
      id: 2,
      title: "Bathroom Remodel Quote",
      client: {
        id: 9,
        name: "Sarah Johnson",
        company: "Johnson Home",
        email: "sarah@example.com",
        phone: "(555) 987-6543"
      },
      value: 8500,
      stage: 'quotes',
      status: 'pending',
      priority: 'medium',
      assignedTo: "admin",
      lastActivity: "2025-06-13",
      notes: "Quote sent for quartz vanity tops",
      createdAt: "2025-06-08",
      updatedAt: "2025-06-13"
    },
    {
      id: 3,
      title: "Commercial Office Lobby",
      client: {
        id: 10,
        name: "Mike Davis",
        company: "Davis Corp",
        email: "mike@daviscorp.com",
        phone: "(555) 456-7890"
      },
      value: 45000,
      stage: 'closes',
      status: 'won',
      priority: 'high',
      assignedTo: "sales_leader",
      lastActivity: "2025-06-12",
      notes: "Signed contract for granite lobby installation",
      createdAt: "2025-05-20",
      updatedAt: "2025-06-12"
    }
  ];

  const [pipelineData, setPipelineData] = useState<PipelineItem[]>(mockPipelineData);

  const getItemsByStage = (stage: 'leads' | 'quotes' | 'closes') => {
    return pipelineData.filter(item => item.stage === stage);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string, stage: string) => {
    if (stage === 'leads') {
      switch (status) {
        case 'new': return 'bg-blue-100 text-blue-800';
        case 'contacted': return 'bg-purple-100 text-purple-800';
        case 'qualified': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    } else if (stage === 'quotes') {
      switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'approved': return 'bg-green-100 text-green-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    } else if (stage === 'closes') {
      switch (status) {
        case 'won': return 'bg-green-100 text-green-800';
        case 'lost': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
    return 'bg-gray-100 text-gray-800';
  };

  const handleItemClick = (item: PipelineItem) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const handleCreateNew = (stage: 'leads' | 'quotes' | 'closes') => {
    setCreateStage(stage);
    setIsCreateModalOpen(true);
  };

  const calculateStageTotal = (stage: 'leads' | 'quotes' | 'closes') => {
    return getItemsByStage(stage).reduce((total, item) => total + (item.value || 0), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getDaysAgo = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - activityDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-neutral-50-custom p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-custom mb-2">Sales Pipeline</h1>
          <p className="text-secondary-custom">Track your leads, quotes, and closed deals</p>
        </div>

        {/* Pipeline Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary-custom">
                {formatCurrency(pipelineData.reduce((total, item) => total + (item.value || 0), 0))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Opportunities</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary-custom">{pipelineData.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Close Rate</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary-custom">
                {Math.round((getItemsByStage('closes').filter(item => item.status === 'won').length / pipelineData.length) * 100)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Open Leads Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-primary-custom">Open Leads</h2>
                <p className="text-sm text-secondary-custom">
                  {getItemsByStage('leads').length} leads • {formatCurrency(calculateStageTotal('leads'))}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleCreateNew('leads')}
                className="bg-accent-orange hover:bg-accent-orange text-white"
              >
                <Plus size={16} className="mr-1" />
                Add Lead
              </Button>
            </div>
            <div className="space-y-3">
              {getItemsByStage('leads').map((item) => (
                <Card 
                  key={item.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleItemClick(item)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-primary-custom line-clamp-2">{item.title}</h3>
                        <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </Badge>
                      </div>
                      
                      {item.client && (
                        <div className="flex items-center space-x-2 text-sm text-secondary-custom">
                          <User size={14} />
                          <span>{item.client.name}</span>
                          {item.client.company && (
                            <>
                              <span>•</span>
                              <span>{item.client.company}</span>
                            </>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={`text-xs ${getStatusColor(item.status, item.stage)}`}>
                            {item.status}
                          </Badge>
                          {item.value && (
                            <span className="text-sm font-medium text-primary-custom">
                              {formatCurrency(item.value)}
                            </span>
                          )}
                        </div>
                        {item.lastActivity && (
                          <span className="text-xs text-secondary-custom">
                            {getDaysAgo(item.lastActivity)}d ago
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Quotes Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-primary-custom">Quotes</h2>
                <p className="text-sm text-secondary-custom">
                  {getItemsByStage('quotes').length} quotes • {formatCurrency(calculateStageTotal('quotes'))}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleCreateNew('quotes')}
                className="bg-accent-orange hover:bg-accent-orange text-white"
              >
                <Plus size={16} className="mr-1" />
                Add Quote
              </Button>
            </div>
            <div className="space-y-3">
              {getItemsByStage('quotes').map((item) => (
                <Card 
                  key={item.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleItemClick(item)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-primary-custom line-clamp-2">{item.title}</h3>
                        <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </Badge>
                      </div>
                      
                      {item.client && (
                        <div className="flex items-center space-x-2 text-sm text-secondary-custom">
                          <User size={14} />
                          <span>{item.client.name}</span>
                          {item.client.company && (
                            <>
                              <span>•</span>
                              <span>{item.client.company}</span>
                            </>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={`text-xs ${getStatusColor(item.status, item.stage)}`}>
                            {item.status}
                          </Badge>
                          {item.value && (
                            <span className="text-sm font-medium text-primary-custom">
                              {formatCurrency(item.value)}
                            </span>
                          )}
                        </div>
                        {item.lastActivity && (
                          <span className="text-xs text-secondary-custom">
                            {getDaysAgo(item.lastActivity)}d ago
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Closes Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-primary-custom">Closes</h2>
                <p className="text-sm text-secondary-custom">
                  {getItemsByStage('closes').length} deals • {formatCurrency(calculateStageTotal('closes'))}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleCreateNew('closes')}
                className="bg-accent-orange hover:bg-accent-orange text-white"
              >
                <Plus size={16} className="mr-1" />
                Add Deal
              </Button>
            </div>
            <div className="space-y-3">
              {getItemsByStage('closes').map((item) => (
                <Card 
                  key={item.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleItemClick(item)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-primary-custom line-clamp-2">{item.title}</h3>
                        <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </Badge>
                      </div>
                      
                      {item.client && (
                        <div className="flex items-center space-x-2 text-sm text-secondary-custom">
                          <User size={14} />
                          <span>{item.client.name}</span>
                          {item.client.company && (
                            <>
                              <span>•</span>
                              <span>{item.client.company}</span>
                            </>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={`text-xs ${getStatusColor(item.status, item.stage)}`}>
                            {item.status}
                          </Badge>
                          {item.value && (
                            <span className="text-sm font-medium text-primary-custom">
                              {formatCurrency(item.value)}
                            </span>
                          )}
                        </div>
                        {item.lastActivity && (
                          <span className="text-xs text-secondary-custom">
                            {getDaysAgo(item.lastActivity)}d ago
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedItem?.title}</DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-secondary-custom">Stage</Label>
                    <p className="capitalize">{selectedItem.stage}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-secondary-custom">Status</Label>
                    <Badge className={`${getStatusColor(selectedItem.status, selectedItem.stage)} mt-1`}>
                      {selectedItem.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-secondary-custom">Priority</Label>
                    <Badge className={`${getPriorityColor(selectedItem.priority)} mt-1`}>
                      {selectedItem.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-secondary-custom">Value</Label>
                    <p className="font-semibold">{selectedItem.value ? formatCurrency(selectedItem.value) : 'Not specified'}</p>
                  </div>
                </div>

                {selectedItem.client && (
                  <div>
                    <Label className="text-sm font-medium text-secondary-custom">Client Information</Label>
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex items-center space-x-2">
                        <User size={16} />
                        <span className="font-medium">{selectedItem.client.name}</span>
                        {selectedItem.client.company && (
                          <>
                            <span>•</span>
                            <span>{selectedItem.client.company}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-secondary-custom">
                        <Mail size={14} />
                        <span>{selectedItem.client.email}</span>
                      </div>
                      {selectedItem.client.phone && (
                        <div className="flex items-center space-x-2 text-sm text-secondary-custom">
                          <Phone size={14} />
                          <span>{selectedItem.client.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedItem.notes && (
                  <div>
                    <Label className="text-sm font-medium text-secondary-custom">Notes</Label>
                    <p className="mt-2 p-3 bg-gray-50 rounded-lg">{selectedItem.notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-sm font-medium text-secondary-custom">Created</Label>
                    <p>{new Date(selectedItem.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-secondary-custom">Last Activity</Label>
                    <p>{selectedItem.lastActivity ? new Date(selectedItem.lastActivity).toLocaleDateString() : 'No activity'}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New {createStage === 'leads' ? 'Lead' : createStage === 'quotes' ? 'Quote' : 'Deal'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-secondary-custom">
                Pipeline creation functionality will be implemented when integrated with the CRM system.
              </p>
              <Button 
                onClick={() => setIsCreateModalOpen(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}