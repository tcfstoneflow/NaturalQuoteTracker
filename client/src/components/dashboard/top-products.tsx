import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dashboardApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function TopProducts() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['/api/dashboard/top-products'],
    queryFn: dashboardApi.getTopProducts,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
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

  const getProductImage = (category: string) => {
    const images = {
      marble: "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=100&h=100&fit=crop",
      granite: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100&h=100&fit=crop",
      travertine: "https://images.unsplash.com/photo-1615971677499-5467cbab01dc?w=100&h=100&fit=crop",
      quartz: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop",
    };
    return images[category as keyof typeof images] || images.marble;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Top Products</CardTitle>
        <Link href="/inventory">
          <Button variant="ghost" size="sm">View All</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products?.map((product: any) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <div className="flex items-center space-x-4 p-2 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer">
                <img 
                  src={product.imageUrl || getProductImage(product.category)}
                  alt={product.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-primary-custom hover:text-accent-orange transition-colors">{product.name}</h4>
                  <p className="text-sm text-secondary-custom">
                    {product.grade?.charAt(0).toUpperCase() + product.grade?.slice(1)} Grade • {product.thickness}
                  </p>
                  <p className="text-sm font-medium text-success-green">
                    ${parseFloat(product.price).toFixed(0)}/{product.unit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-primary-custom">
                    {product.salesCount || 0}
                  </p>
                  <p className="text-xs text-secondary-custom">sold</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
