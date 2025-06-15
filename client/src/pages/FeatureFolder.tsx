import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Target, 
  Users, 
  TrendingUp, 
  BarChart3, 
  Truck, 
  Package, 
  Building2,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const featureCategories = [
  {
    title: "Sales & Customer Management",
    description: "Tools for managing sales processes and customer relationships",
    features: [
      { name: "Cart", href: "/cart", icon: ShoppingCart, description: "Manage shopping cart and orders" },
      { name: "Sales Dashboard", href: "/sales-dashboard", icon: Target, description: "Overview of sales activities" },
      { name: "Sales Leader", href: "/sales-leader", icon: Users, description: "Sales team management", roles: ['sales_leader'] },
    ]
  },
  {
    title: "KPI Tracking & Analytics",
    description: "Monitor key performance indicators across different business areas",
    features: [
      { name: "Marketing KPI", href: "/marketing-kpi", icon: TrendingUp, description: "Track marketing performance metrics" },
      { name: "Sales KPI", href: "/sales-kpi", icon: BarChart3, description: "Monitor sales performance indicators" },
      { name: "Supply KPI", href: "/supply-kpi", icon: Truck, description: "Track supply chain metrics" },
      { name: "Inventory Tracking", href: "/inventory-tracking", icon: Package, description: "Monitor inventory levels and movement" },
      { name: "Company KPI", href: "/company-kpi", icon: Building2, description: "Overall company performance tracking" },
    ]
  }
];

export default function FeatureFolder() {
  const { user } = useAuth();

  const hasAccess = (roles?: string[]) => {
    if (!roles) return true;
    return roles.includes(user?.role || '');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Feature Folder</h1>
          </div>
          <p className="text-lg text-gray-600">
            Explore advanced features and specialized tools for enhanced productivity
          </p>
          <Badge variant="outline" className="mt-2">
            {featureCategories.reduce((count, category) => 
              count + category.features.filter(f => hasAccess(f.roles)).length, 0
            )} features available
          </Badge>
        </div>

        <div className="space-y-8">
          {featureCategories.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {category.title}
                </h2>
                <p className="text-gray-600">{category.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.features
                  .filter(feature => hasAccess(feature.roles))
                  .map((feature, featureIndex) => {
                    const Icon = feature.icon;
                    return (
                      <Card key={featureIndex} className="hover:shadow-lg transition-shadow duration-200 group">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                <Icon className="h-5 w-5 text-blue-600" />
                              </div>
                              <CardTitle className="text-lg">{feature.name}</CardTitle>
                            </div>
                            {feature.roles && (
                              <Badge variant="secondary" className="text-xs">
                                {feature.roles.join(', ')}
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="text-sm">
                            {feature.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <Link href={feature.href}>
                            <Button 
                              className="w-full group-hover:bg-blue-600 transition-colors"
                              variant="default"
                            >
                              <span>Access Feature</span>
                              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Access Panel */}
        <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Need something specific?
              </h3>
              <p className="text-gray-600">
                Can't find what you're looking for? Check the main navigation or contact support.
              </p>
            </div>
            <div className="flex space-x-3">
              <Link href="/">
                <Button variant="outline">
                  Back to Dashboard
                </Button>
              </Link>
              <Link href="/reports">
                <Button>
                  View Reports
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}