import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertTriangle, Clock, CheckCircle, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PaymentStatusReport() {
  const { data: paymentData, isLoading } = useQuery({
    queryKey: ["/api/reports/payment-status"],
    queryFn: () => fetch("/api/reports/payment-status").then(res => res.json()),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Status Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <CreditCard className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Status Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(paymentData?.totalPaid || 0)}
              </div>
              <div className="text-xs text-gray-600">Total Paid</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-lg font-bold text-yellow-600">
                {formatCurrency(paymentData?.totalPending || 0)}
              </div>
              <div className="text-xs text-gray-600">Pending</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-lg font-bold text-red-600">
                {formatCurrency(paymentData?.totalOverdue || 0)}
              </div>
              <div className="text-xs text-gray-600">Overdue</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {paymentData?.averageCollectionDays || 0}
              </div>
              <div className="text-xs text-gray-600">Avg Collection Days</div>
            </div>
          </div>

          {/* Outstanding Invoices */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Outstanding Invoices
            </h4>
            <div className="space-y-3">
              {paymentData?.outstandingInvoices?.map((invoice: any) => (
                <div key={invoice.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium">Quote #{invoice.quoteNumber}</div>
                      <div className="text-sm text-gray-600">
                        {invoice.clientName} • Due: {formatDate(invoice.dueDate)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{formatCurrency(invoice.amount)}</div>
                      <Badge className={getStatusColor(invoice.status)}>
                        {getStatusIcon(invoice.status)}
                        <span className="ml-1 capitalize">{invoice.status}</span>
                      </Badge>
                    </div>
                  </div>

                  {invoice.status === 'overdue' && (
                    <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      {getDaysOverdue(invoice.dueDate)} days overdue
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="text-gray-600">
                      Last contact: {invoice.lastContact ? formatDate(invoice.lastContact) : 'Never'}
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Send Reminder
                      </Button>
                      <Button size="sm" variant="outline">
                        Mark Paid
                      </Button>
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  No outstanding invoices
                </div>
              )}
            </div>
          </div>

          {/* Collection Metrics */}
          <div>
            <h4 className="font-semibold mb-3">Collection Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium mb-3">Payment Methods</h5>
                <div className="space-y-2 text-sm">
                  {paymentData?.paymentMethods?.map((method: any) => (
                    <div key={method.type} className="flex justify-between">
                      <span>{method.type}</span>
                      <span className="font-medium">{method.percentage}%</span>
                    </div>
                  )) || (
                    <div className="text-gray-500">No payment method data</div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium mb-3">Collection Performance</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Collection Rate</span>
                    <span className="font-medium text-green-600">
                      {paymentData?.collectionRate || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bad Debt Rate</span>
                    <span className="font-medium text-red-600">
                      {paymentData?.badDebtRate || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>On-time Payments</span>
                    <span className="font-medium text-blue-600">
                      {paymentData?.onTimePayments || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Items */}
          {paymentData?.actionItems && paymentData.actionItems.length > 0 && (
            <div className="p-4 bg-orange-50 rounded-lg">
              <h5 className="font-medium mb-2 text-orange-800">Action Items</h5>
              <ul className="space-y-1 text-sm text-orange-700">
                {paymentData.actionItems.map((item: string, index: number) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              Export Payment Report
            </Button>
            <Button variant="outline" className="flex-1">
              Send Bulk Reminders
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}