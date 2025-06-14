import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Phone, Mail, Clock, User, MessageSquare, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, addMonths, subMonths, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ShowroomVisit {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
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
  const [assignedToUserId, setAssignedToUserId] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editVisitDate, setEditVisitDate] = useState("");
  const [editVisitTime, setEditVisitTime] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [newVisit, setNewVisit] = useState({
    name: "",
    email: "",
    phone: "",
    visitDate: "",
    visitTime: "",
    message: "",
    assignedToUserId: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ["/api/showroom-visits"],
  });

  // Fetch sales managers for the dropdown
  const { data: salesManagers = [] } = useQuery({
    queryKey: ["/api/sales-dashboard/sales-managers"],
    queryFn: async () => {
      const response = await fetch('/api/sales-dashboard/sales-managers', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch sales managers');
      }
      return response.json();
    },
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
      queryClient.invalidateQueries({ queryKey: ["/api/sales-dashboard/pending-showroom-visits"] });
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

  const createVisitMutation = useMutation({
    mutationFn: async (visitData: any) => {
      const response = await fetch("/api/showroom-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visitData),
      });
      if (!response.ok) throw new Error("Failed to create visit");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/showroom-visits"] });
      toast({
        title: "Visit Created",
        description: "The showroom visit has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      setNewVisit({
        name: "",
        email: "",
        phone: "",
        visitDate: "",
        visitTime: "",
        message: "",
        assignedToUserId: "",
      });
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create the visit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateVisit = () => {
    if (!selectedVisit) return;
    
    // Find the assigned sales member name if a user is assigned
    const assignedSalesMember = assignedToUserId && assignedToUserId !== "none" 
      ? salesManagers.find(sm => sm.id === parseInt(assignedToUserId))?.name
      : null;
    
    updateVisitMutation.mutate({
      id: selectedVisit.id,
      updates: {
        name: editName,
        email: editEmail,
        phone: editPhone,
        preferredDate: editVisitDate,
        preferredTime: editVisitTime || null,
        status: status || selectedVisit.status,
        notes: notes || selectedVisit.notes,
        assignedToUserId: assignedToUserId && assignedToUserId !== "none" ? parseInt(assignedToUserId) : null,
        assignedSalesMember,
      },
    });
  };

  const handleCreateVisit = () => {
    if (!newVisit.name || !newVisit.email || !newVisit.visitDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in name, email, and visit date.",
        variant: "destructive",
      });
      return;
    }

    createVisitMutation.mutate({
      name: newVisit.name,
      email: newVisit.email,
      phone: newVisit.phone,
      preferredDate: newVisit.visitDate,
      preferredTime: newVisit.visitTime || null,
      message: newVisit.message || null,
      status: "scheduled",
      assignedToUserId: (newVisit.assignedToUserId && newVisit.assignedToUserId !== "unassigned") ? parseInt(newVisit.assignedToUserId) : null,
      assignedSalesMember: (newVisit.assignedToUserId && newVisit.assignedToUserId !== "unassigned")
        ? salesManagers.find(sm => sm.id === parseInt(newVisit.assignedToUserId))?.name 
        : null
    });
  };

  const openUpdateDialog = (visit: ShowroomVisit) => {
    setSelectedVisit(visit);
    setStatus(visit.status);
    setNotes(visit.notes || "");
    setAssignedToUserId(visit.assignedToUserId?.toString() || "none");
    setEditName(visit.name);
    setEditEmail(visit.email);
    setEditPhone(visit.phone || "");
    setEditVisitDate(visit.preferredDate || "");
    setEditVisitTime(visit.preferredTime || "");
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

  // Calendar helper functions
  const monthStart = startOfMonth(currentCalendarDate);
  const monthEnd = endOfMonth(currentCalendarDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get starting day of week (0 = Sunday, 1 = Monday, etc.)
  const startDay = getDay(monthStart);
  
  // Create array of empty cells for days before month starts
  const emptyDays = Array.from({ length: startDay }, (_, i) => i);
  
  // Filter visits for current month
  const monthVisits = visits.filter((visit: ShowroomVisit) => {
    if (!visit.preferredDate) return false;
    try {
      const visitDate = parseISO(visit.preferredDate);
      return visitDate >= monthStart && visitDate <= monthEnd;
    } catch {
      return false;
    }
  });
  
  // Get visits for a specific day
  const getVisitsForDay = (day: Date) => {
    return monthVisits.filter((visit: ShowroomVisit) => {
      if (!visit.preferredDate) return false;
      try {
        const visitDate = parseISO(visit.preferredDate);
        return isSameDay(visitDate, day);
      } catch {
        return false;
      }
    });
  };

  const CalendarView = () => (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">
            {format(currentCalendarDate, "MMMM yyyy")} Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentCalendarDate(subMonths(currentCalendarDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentCalendarDate(addMonths(currentCalendarDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {emptyDays.map(i => (
            <div key={`empty-${i}`} className="h-20"></div>
          ))}
          {monthDays.map(day => {
            const dayVisits = getVisitsForDay(day);
            const isCurrentDay = isToday(day);
            
            return (
              <div
                key={day.toISOString()}
                className={`min-h-16 h-auto p-1 border rounded text-xs ${
                  isCurrentDay ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className={`font-medium mb-1 ${isCurrentDay ? 'text-blue-600' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayVisits.slice(0, 2).map((visit: ShowroomVisit) => (
                    <div
                      key={visit.id}
                      className={`px-1 py-0.5 rounded text-xs truncate cursor-pointer hover:opacity-80 transition-opacity ${
                        visit.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        visit.status === 'completed' ? 'bg-green-100 text-green-800' :
                        visit.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}
                      title={`${visit.name}${visit.preferredTime ? ` at ${visit.preferredTime}` : ''} - ${visit.status}`}
                      onClick={() => openUpdateDialog(visit)}
                    >
                      {visit.preferredTime && (
                        <div className="font-semibold text-xs leading-tight">{visit.preferredTime}</div>
                      )}
                      <div className="truncate leading-tight">{visit.name}</div>
                      {visit.assignedSalesMember && (
                        <div className="text-xs opacity-75 truncate leading-tight">
                          {visit.assignedSalesMember}
                        </div>
                      )}
                    </div>
                  ))}
                  {dayVisits.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{dayVisits.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Showroom Visit Requests</h1>
          <p className="text-gray-600">Manage customer showroom visit requests and follow-ups</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add New Visit</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Showroom Visit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Customer Name *</label>
                <Input
                  value={newVisit.name}
                  onChange={(e) => setNewVisit(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={newVisit.email}
                  onChange={(e) => setNewVisit(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={newVisit.phone}
                  onChange={(e) => setNewVisit(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Date of Showroom Visit *</label>
                <Input
                  type="date"
                  value={newVisit.visitDate}
                  onChange={(e) => setNewVisit(prev => ({ ...prev, visitDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Time of Showroom Visit</label>
                <Input
                  type="time"
                  value={newVisit.visitTime}
                  onChange={(e) => setNewVisit(prev => ({ ...prev, visitTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Assign to Sales Member</label>
                <Select value={newVisit.assignedToUserId} onValueChange={(value) => setNewVisit(prev => ({ ...prev, assignedToUserId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sales member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {salesManagers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id.toString()}>
                        {manager.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Message/Notes</label>
                <Textarea
                  value={newVisit.message}
                  onChange={(e) => setNewVisit(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter any additional notes or messages"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={createVisitMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateVisit}
                  disabled={createVisitMutation.isPending}
                >
                  {createVisitMutation.isPending ? "Creating..." : "Create Visit"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar View */}
      <CalendarView />

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
              {visit.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{visit.phone}</span>
                </div>
              )}
              {visit.preferredDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    Showroom Visit: {visit.preferredDate}
                    {visit.preferredTime && ` at ${visit.preferredTime}`}
                  </span>
                </div>
              )}
              {visit.assignedSalesMember && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 font-medium">Sales member: {visit.assignedSalesMember}</span>
                </div>
              )}
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
                    Edit Appointment
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Update Visit: {visit.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Customer Message Section */}
                    {visit.message && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          {visit.message.includes('Project Type:') || visit.message.includes('Favorite Products:') ? 'Consultation Request Details' : 'Customer Message'}
                        </h4>
                        {visit.message.includes('Project Type:') || visit.message.includes('Favorite Products:') ? (
                          <div className="space-y-3">
                            {(() => {
                              const message = visit.message;
                              let projectType = '';
                              let projectDescription = '';
                              let favoriteProductsSection = '';
                              
                              // Extract project type
                              if (message.includes('Project Type:')) {
                                const projectTypeMatch = message.match(/Project Type:\s*(.+?)(\n|$)/);
                                projectType = projectTypeMatch ? projectTypeMatch[1].trim() : '';
                              }
                              
                              // Split message into sections
                              const parts = message.split('Favorite Products:');
                              const beforeFavorites = parts[0];
                              favoriteProductsSection = parts[1];
                              
                              // Extract project description (everything after project type but before favorites)
                              if (beforeFavorites.includes('Project Type:')) {
                                projectDescription = beforeFavorites.split('Project Type:')[1]?.replace(projectType, '').trim() || '';
                              } else {
                                projectDescription = beforeFavorites.trim();
                              }
                              
                              return (
                                <>
                                  {projectType && (
                                    <div>
                                      <span className="text-sm font-medium text-blue-800">Project Type:</span>
                                      <p className="text-sm text-blue-700 mt-1 font-semibold">{projectType}</p>
                                    </div>
                                  )}
                                  {projectDescription && (
                                    <div>
                                      <span className="text-sm font-medium text-blue-800">Project Description:</span>
                                      <p className="text-sm text-blue-700 mt-1">{projectDescription}</p>
                                    </div>
                                  )}
                                  {favoriteProductsSection && (
                                    <div>
                                      <span className="text-sm font-medium text-blue-800">Favorite Slabs to Review:</span>
                                      <div className="text-sm text-blue-700 mt-1">
                                        {favoriteProductsSection.split('\n').filter(line => line.trim().startsWith('•')).map((line, index) => (
                                          <div key={index} className="flex items-start gap-2 mt-1">
                                            <span className="text-blue-600">•</span>
                                            <span>{line.replace('•', '').trim()}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="text-sm text-blue-700 whitespace-pre-wrap">
                            {visit.message}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Customer Name</label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone</label>
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Showroom Visit Date</label>
                      <Input
                        type="date"
                        value={editVisitDate}
                        onChange={(e) => setEditVisitDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Showroom Visit Time</label>
                      <Input
                        type="time"
                        value={editVisitTime}
                        onChange={(e) => setEditVisitTime(e.target.value)}
                      />
                    </div>
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
                      <label className="text-sm font-medium">Assign Sales Member</label>
                      <Select value={assignedToUserId} onValueChange={setAssignedToUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sales manager..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No assignment</SelectItem>
                          {salesManagers.map((manager: any) => (
                            <SelectItem key={manager.id} value={manager.id.toString()}>
                              {manager.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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