import React from 'react';
import { Button } from '@/components/ui/button';
import { Store, Package, Users, TrendingUp } from 'lucide-react';

interface WelcomeStepProps {
  onNext?: () => void;
  loading?: boolean;
  onboardingData?: any;
  setOnboardingData?: any;
  onComplete?: any;
  setLoading?: any;
}

export default function WelcomeStep({ onNext, loading = false }: WelcomeStepProps) {
  const features = [
    {
      icon: Store,
      title: "Multi-Store Management",
      description: "Manage inventory across multiple store locations"
    },
    {
      icon: Package,
      title: "Smart Inventory",
      description: "Track items, variants, and stock levels in real-time"
    },
    {
      icon: Users,
      title: "Supplier Relations",
      description: "Maintain supplier information and purchase history"
    },
    {
      icon: TrendingUp,
      title: "Sales Analytics",
      description: "Get insights into your sales performance and trends"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Store className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">
          Ready to transform your furniture business?
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          FurnitureERP is designed specifically for furniture retailers and manufacturers. 
          Let's set up your workspace to start managing your inventory, sales, and suppliers efficiently.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start space-x-3 p-4 rounded-lg bg-accent/5 border">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <feature.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-4">
        <Button 
          onClick={onNext} 
          disabled={loading}
          size="lg"
          className="px-8"
        >
          Let's Get Started
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          This setup takes about 3-5 minutes
        </p>
      </div>
    </div>
  );
}