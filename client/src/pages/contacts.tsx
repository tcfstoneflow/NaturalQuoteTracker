import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Mail, 
  Plus, 
  Edit2, 
  Trash2, 
  Send, 
  UserPlus,
  Building2,
  Phone,
  MapPin,
  Calendar,
  Target,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Link } from "wouter";

// Schemas for mailing lists
const mailingListSchema = z.object({
  name: z.string().min(1, "List name is required"),
  description: z.string().optional(),
  category: z.enum(["prospects", "customers", "suppliers", "partners", "general"]),
});

const contactSchema = z.object({
  email: z.string().email("Valid email is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  company: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type MailingList = {
  id: number;
  name: string;
  description?: string;
  category: string;
  subscriberCount: number;
  createdAt: string;
};

type Contact = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  mailingLists: string[];
};

export default function Contacts() {
  const [activeTab, setActiveTab] = useState("mailing-lists");
  const [selectedList, setSelectedList] = useState<MailingList | null>(null);
  const [isAddListDialogOpen, setIsAddListDialogOpen] = useState(false);
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Forms
  const mailingListForm = useForm({
    resolver: zodResolver(mailingListSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "general",
    },
  });

  const contactForm = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      company: "",
      phone: "",
      notes: "",
    },
  });

  // Mock data queries (replace with real API calls)
  const { data: mailingLists = [], isLoading: listsLoading } = useQuery({
    queryKey: ['/api/mailing-lists'],
    queryFn: () => Promise.resolve([
      {
        id: 1,
        name: "Customer Newsletter",
        description: "Monthly updates for existing customers",
        category: "customers",
        subscriberCount: 245,
        createdAt: "2024-01-15T10:00:00Z",
      },
      {
        id: 2,
        name: "Prospect Outreach",
        description: "Lead nurturing campaigns",
        category: "prospects",
        subscriberCount: 182,
        createdAt: "2024-02-01T14:30:00Z",
      },
      {
        id: 3,
        name: "Supplier Updates",
        description: "Communication with material suppliers",
        category: "suppliers",
        subscriberCount: 28,
        createdAt: "2024-01-20T09:15:00Z",
      },
    ] as MailingList[]),
  });

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['/api/contacts'],
    queryFn: () => Promise.resolve([
      {
        id: 1,
        email: "john.smith@example.com",
        firstName: "John",
        lastName: "Smith",
        company: "Smith Construction",
        phone: "(555) 123-4567",
        notes: "Interested in granite countertops",
        createdAt: "2024-01-10T12:00:00Z",
        mailingLists: ["Customer Newsletter", "Prospect Outreach"],
      },
      {
        id: 2,
        email: "sarah.johnson@homedesign.com",
        firstName: "Sarah",
        lastName: "Johnson",
        company: "Modern Home Design",
        phone: "(555) 987-6543",
        notes: "Interior designer, bulk orders",
        createdAt: "2024-01-12T15:30:00Z",
        mailingLists: ["Customer Newsletter"],
      },
    ] as Contact[]),
  });

  // Mutations
  const createListMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/mailing-lists', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mailing-lists'] });
      setIsAddListDialogOpen(false);
      mailingListForm.reset();
      toast({ title: "Success", description: "Mailing list created successfully" });
    },
  });

  const createContactMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      setIsAddContactDialogOpen(false);
      contactForm.reset();
      toast({ title: "Success", description: "Contact added successfully" });
    },
  });

  const categoryColors = {
    prospects: "bg-blue-100 text-blue-800 border-blue-200",
    customers: "bg-green-100 text-green-800 border-green-200",
    suppliers: "bg-purple-100 text-purple-800 border-purple-200",
    partners: "bg-orange-100 text-orange-800 border-orange-200",
    general: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Contacts & Mailing Lists</h1>
              <p className="text-lg text-gray-600 mt-2">
                Manage your contact database and email marketing campaigns
              </p>
            </div>
            <div className="flex space-x-3">
              <Link href="/clients">
                <Button variant="outline" className="flex items-center space-x-2">
                  <Building2 size={16} />
                  <span>View Clients</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mailing-lists" className="flex items-center space-x-2">
              <Mail size={16} />
              <span>Mailing Lists</span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center space-x-2">
              <Users size={16} />
              <span>Contacts</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center space-x-2">
              <Send size={16} />
              <span>Campaigns</span>
            </TabsTrigger>
          </TabsList>

          {/* Mailing Lists Tab */}
          <TabsContent value="mailing-lists" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Mailing Lists</h2>
              <Dialog open={isAddListDialogOpen} onOpenChange={setIsAddListDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-2">
                    <Plus size={16} />
                    <span>Create List</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Mailing List</DialogTitle>
                    <DialogDescription>
                      Set up a new mailing list to organize your contacts
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...mailingListForm}>
                    <form onSubmit={mailingListForm.handleSubmit((data) => createListMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={mailingListForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>List Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter list name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={mailingListForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Optional description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={mailingListForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="prospects">Prospects</SelectItem>
                                <SelectItem value="customers">Customers</SelectItem>
                                <SelectItem value="suppliers">Suppliers</SelectItem>
                                <SelectItem value="partners">Partners</SelectItem>
                                <SelectItem value="general">General</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createListMutation.isPending} className="w-full">
                        {createListMutation.isPending ? "Creating..." : "Create List"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mailingLists.map((list) => (
                <Card key={list.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{list.name}</CardTitle>
                      <Badge className={categoryColors[list.category as keyof typeof categoryColors]}>
                        {list.category}
                      </Badge>
                    </div>
                    <CardDescription>{list.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users size={16} className="text-gray-500" />
                        <span className="text-sm text-gray-600">{list.subscriberCount} subscribers</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye size={14} />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Contacts Database</h2>
              <Dialog open={isAddContactDialogOpen} onOpenChange={setIsAddContactDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-2">
                    <UserPlus size={16} />
                    <span>Add Contact</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Contact</DialogTitle>
                    <DialogDescription>
                      Add a new contact to your database
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...contactForm}>
                    <form onSubmit={contactForm.handleSubmit((data) => createContactMutation.mutate(data))} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={contactForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={contactForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Smith" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={contactForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={contactForm.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company</FormLabel>
                            <FormControl>
                              <Input placeholder="Company name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={contactForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="(555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={contactForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Additional notes..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createContactMutation.isPending} className="w-full">
                        {createContactMutation.isPending ? "Adding..." : "Add Contact"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lists
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {contact.firstName} {contact.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{contact.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {contact.company || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {contact.phone || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {contact.mailingLists.map((list, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {list}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Button size="sm" variant="outline">
                              <Edit2 size={14} />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Email Campaigns</h2>
              <Button className="flex items-center space-x-2">
                <Send size={16} />
                <span>Create Campaign</span>
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Center</CardTitle>
                <CardDescription>
                  Create and manage email marketing campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Mail size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
                  <p className="text-gray-500 mb-4">
                    Start engaging with your contacts by creating your first email campaign
                  </p>
                  <Button>
                    <Send size={16} className="mr-2" />
                    Create Your First Campaign
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}