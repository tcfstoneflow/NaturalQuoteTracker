import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { dashboardApi } from "@/lib/api";
import { Eye, Edit, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";

export default function RecentQuotes() {
  const [, setLocation] = useLocation();
  
  const { data: quotes, isLoading } = useQuery({
    queryKey: ['/api/dashboard/recent-quotes'],
    queryFn: dashboardApi.getRecentQuotes,
  });

  const handleViewQuote = (quoteId: number) => {
    setLocation(`/quotes?view=${quoteId}`);
  };

  const handleEditQuote = (quoteId: number) => {
    setLocation(`/quotes?edit=${quoteId}`);
  };

  const handleSendQuote = (quoteId: number) => {
    setLocation(`/quotes?send=${quoteId}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Quotes</CardTitle>
        <Link href="/quotes">
          <Button variant="ghost" size="sm">View All</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-3 px-2 text-sm font-medium text-secondary-custom">Quote #</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-secondary-custom">Client</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-secondary-custom">Created By</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-secondary-custom">Amount</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-secondary-custom">Status</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-secondary-custom">Date</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-secondary-custom">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes?.map((quote: any) => (
                <tr key={quote.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="py-4 px-2">
                    <span className="font-medium text-primary-custom">{quote.quoteNumber}</span>
                  </td>
                  <td className="py-4 px-2">
                    <div>
                      <p className="font-medium text-primary-custom">
                        {quote.client ? (quote.client.company || quote.client.name) : 'No Client'}
                      </p>
                      <p className="text-sm text-secondary-custom">
                        {quote.client ? quote.client.name : 'Unknown'}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-600">
                          {quote.creator?.firstName?.[0] || quote.creator?.username?.[0] || '?'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-700">
                        {quote.creator?.firstName || quote.creator?.username || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <span className="font-semibold text-primary-custom">
                      ${parseFloat(quote.totalAmount).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-4 px-2">
                    <Badge className={`${getStatusColor(quote.status)} border-0`}>
                      {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="py-4 px-2">
                    <span className="text-secondary-custom">
                      {new Date(quote.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-4 px-2">
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="View"
                        onClick={() => handleViewQuote(quote.id)}
                      >
                        <Eye size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Edit"
                        onClick={() => handleEditQuote(quote.id)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Send"
                        onClick={() => handleSendQuote(quote.id)}
                      >
                        <Send size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
