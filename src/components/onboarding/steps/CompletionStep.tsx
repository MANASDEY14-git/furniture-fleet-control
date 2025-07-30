import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Store, Package, Users, ArrowRight } from 'lucide-react';

interface CompletionStepProps {
  onboardingData?: any;
  onComplete?: () => void;
  loading?: boolean;
  onNext?: any;
  setOnboardingData?: any;
  setLoading?: any;
}

export default function CompletionStep({ 
  onboardingData = {}, 
  onComplete = () => {}, 
  loading = false 
}: CompletionStepProps) {
  const setupSummary = [
    {
      icon: Store,
      title: "Store Created",
      description: "Your primary store location is set up",
      completed: !!onboardingData.storeId,
    },
    {
      icon: Package,
      title: "Inventory Added",
      description: `${onboardingData.itemIds?.length || 0} items added to inventory`,
      completed: onboardingData.itemIds?.length > 0,
    },
    {
      icon: Users,
      title: "Suppliers Added",
      description: `${onboardingData.supplierIds?.length || 0} suppliers configured`,
      completed: onboardingData.supplierIds?.length > 0,
    },
  ];

  const nextSteps = [
    "Explore your dashboard to see key metrics",
    "Add more inventory items or import via CSV", 
    "Record your first sale or purchase",
    "Set up user roles and permissions",
    "Configure payment methods and delivery options"
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-semibold mb-2 text-green-700">
          Congratulations! 🎉
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Your FurnitureERP is now set up and ready to help you manage your business efficiently.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">Setup Summary</h3>
          <div className="space-y-3">
            {setupSummary.map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  item.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.title}</span>
                    {item.completed && <Badge variant="secondary" className="text-xs">✓</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">What's Next?</h3>
          <div className="space-y-2">
            {nextSteps.map((step, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <span className="text-sm">{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-center pt-6">
        <Button 
          onClick={onComplete} 
          disabled={loading}
          size="lg"
          className="px-8"
        >
          {loading ? 'Finalizing Setup...' : 'Enter Dashboard'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          You can always access these settings later from the Settings page
        </p>
      </div>

      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-6 text-center">
        <h3 className="font-semibold mb-2">Welcome to Your Business Management Hub! 🚀</h3>
        <p className="text-sm text-muted-foreground">
          You're all set to start managing your furniture business more efficiently. 
          Need help? Check out our guides in the Help section.
        </p>
      </div>
    </div>
  );
}