import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dashboardApi } from "@/lib/api";
import { Check, UserPlus, FileText, Package, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecentActivity() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['/api/dashboard/recent-activities'],
    queryFn: dashboardApi.getRecentActivities,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quote_approved': return { icon: Check, color: 'bg-green-100 text-success-green' };
      case 'quote_rejected': return { icon: X, color: 'bg-red-100 text-error-red' };
      case 'quote_created':
      case 'quote_sent': return { icon: FileText, color: 'bg-orange-100 text-warning-orange' };
      case 'client_added': return { icon: UserPlus, color: 'bg-blue-100 text-primary' };
      case 'product_updated': return { icon: Package, color: 'bg-purple-100 text-purple-600' };
      default: return { icon: FileText, color: 'bg-gray-100 text-gray-600' };
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return '1 day ago';
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Activity</CardTitle>
        <Button variant="ghost" size="sm">View All</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities?.map((activity: any) => {
            const { icon: Icon, color } = getActivityIcon(activity.type);
            
            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary-custom">{activity.description}</p>
                  <p className="text-xs text-secondary-custom">
                    {formatTimeAgo(activity.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
