import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Phone, Mail, Clock, User, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ShowroomVisit {
  id: number;
  name: string;
  email: string;
  phone: string;
  preferredDate: string;
  message: string | null;
  status: string;
  assignedToUserId: number | null;
  assignedSalesMember: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels = {
  pending: "Pending",
  scheduled: "Scheduled", 
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function ShowroomVisits() {
  const [selectedVisit, setSelectedVisit] = useState<ShowroomVisit | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [assignedSalesMember, setAssignedSalesMember] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ["/api/showroom-visits"],
  });

  const updateVisitMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await fetch(`/api/showroom-visits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update visit");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/showroom-visits"] });
      toast({
        title: "Visit Updated",
        description: "The showroom visit has been updated successfully.",
      });
      setSelectedVisit(null);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update the visit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateVisit = () => {
    if (!selectedVisit) return;
    
    updateVisitMutation.mutate({
      id: selectedVisit.id,
      updates: {
        status: status || selectedVisit.status,
        notes: notes || selectedVisit.notes,
        assignedSalesMember: assignedSalesMember || selectedVisit.assignedSalesMember,
      },
    });
  };

  const openUpdateDialog = (visit: ShowroomVisit) => {
    setSelectedVisit(visit);
    setStatus(visit.status);
    setNotes(visit.notes || "");
    setAssignedSalesMember(visit.assignedSalesMember || "");
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pendingVisits = visits.filter((visit: ShowroomVisit) => visit.status === "pending");
  const scheduledVisits = visits.filter((visit: ShowroomVisit) => visit.status === "scheduled");
  const completedVisits = visits.filter((visit: ShowroomVisit) => visit.status === "completed");

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Showroom Visit Requests</h1>
        <p className="text-gray-600">Manage customer showroom visit requests and follow-ups</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingVisits.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{scheduledVisits.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedVisits.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{visits.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Visits List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visits.map((visit: ShowroomVisit) => (
          <Card key={visit.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{visit.name}</CardTitle>
                <Badge className={statusColors[visit.status as keyof typeof statusColors]}>
                  {statusLabels[visit.status as keyof typeof statusLabels]}
                </Badge>
              </div>
              <CardDescription className="text-sm text-gray-500">
                Requested {format(new Date(visit.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{visit.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{visit.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Preferred: {visit.preferredDate}</span>
              </div>
              {visit.message && (
                <div className="flex items-start gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-600 line-clamp-2">{visit.message}</span>
                </div>
              )}
              {visit.notes && (
                <div className="flex items-start gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-600 font-medium">Notes: {visit.notes}</span>
                </div>
              )}
              <Dialog open={selectedVisit?.id === visit.id} onOpenChange={(open) => !open && setSelectedVisit(null)}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => openUpdateDialog(visit)}
                  >
                    Update Status
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Update Visit: {visit.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assign Sales member</label>
                      <Input
                        value={assignedSalesMember}
                        onChange={(e) => setAssignedSalesMember(e.target.value)}
                        placeholder="Enter sales member name..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notes</label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this visit..."
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedVisit(null)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleUpdateVisit}
                        disabled={updateVisitMutation.isPending}
                      >
                        {updateVisitMutation.isPending ? "Updating..." : "Update Visit"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>

      {visits.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Visit Requests</h3>
          <p className="text-gray-600">Customer showroom visit requests will appear here.</p>
        </div>
      )}
    </div>
  );
}