import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import WelcomeStep from './steps/WelcomeStep';
import StoreSetupStep from './steps/StoreSetupStep';
import InventorySetupStep from './steps/InventorySetupStep';
import SupplierSetupStep from './steps/SupplierSetupStep';
import CompletionStep from './steps/CompletionStep';

const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome', component: WelcomeStep },
  { id: 'store', title: 'Store Setup', component: StoreSetupStep },
  { id: 'inventory', title: 'Initial Inventory', component: InventorySetupStep },
  { id: 'supplier', title: 'Supplier Setup', component: SupplierSetupStep },
  { id: 'completion', title: 'Complete', component: CompletionStep },
];

interface OnboardingData {
  storeId?: string;
  itemIds?: string[];
  supplierIds?: string[];
}

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Load existing onboarding progress if any
    const loadOnboardingProgress = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_step, onboarding_completed')
          .eq('user_id', user.id)
          .single();

        if (profile?.onboarding_completed) {
          navigate('/dashboard');
          return;
        }

        if (profile?.onboarding_step) {
          setCurrentStep(profile.onboarding_step);
        }
      } catch (error) {
        console.error('Error loading onboarding progress:', error);
      }
    };

    loadOnboardingProgress();
  }, [user, navigate]);

  const updateOnboardingProgress = async (step: number) => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ onboarding_step: step })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: true,
          onboarding_step: ONBOARDING_STEPS.length - 1
        })
        .eq('user_id', user.id);

      toast({
        title: "Welcome aboard!",
        description: "Your setup is complete. Let's start managing your business!",
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    }
  };

  const nextStep = async () => {
    const newStep = Math.min(currentStep + 1, ONBOARDING_STEPS.length - 1);
    setCurrentStep(newStep);
    await updateOnboardingProgress(newStep);
  };

  const prevStep = async () => {
    const newStep = Math.max(currentStep - 1, 0);
    setCurrentStep(newStep);
    await updateOnboardingProgress(newStep);
  };

  const skipToEnd = async () => {
    await completeOnboarding();
  };

  const progressPercentage = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;
  const CurrentStepComponent = ONBOARDING_STEPS[currentStep].component;

  const renderCurrentStep = () => {
    const stepProps = {
      onboardingData,
      setOnboardingData,
      onNext: nextStep,
      onComplete: completeOnboarding,
      loading,
      setLoading,
    };

    return <CurrentStepComponent {...stepProps} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/10 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to FurnitureERP</h1>
          <p className="text-muted-foreground">
            Let's get your business set up in just a few minutes
          </p>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium">
                Step {currentStep + 1} of {ONBOARDING_STEPS.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progressPercentage)}% Complete
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between mt-2">
              {ONBOARDING_STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={`text-xs ${
                    index <= currentStep ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {step.title}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Step */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{ONBOARDING_STEPS[currentStep].title}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderCurrentStep()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {currentStep < ONBOARDING_STEPS.length - 2 && (
              <Button
                variant="ghost"
                onClick={skipToEnd}
                className="text-muted-foreground hover:text-foreground"
              >
                Skip Setup
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}