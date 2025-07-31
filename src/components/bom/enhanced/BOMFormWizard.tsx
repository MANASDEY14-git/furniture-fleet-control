import { useState } from 'react';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CreateBOMData, CreateBOMComponentData } from '@/types/bom';
import { BOMBasicInfoStep } from './wizard/BOMBasicInfoStep';
import { BOMComponentsStep } from './wizard/BOMComponentsStep';
import { BOMReviewStep } from './wizard/BOMReviewStep';
import { useBOMValidation } from '@/hooks/useEnhancedBOM';

interface BOMFormWizardProps {
  itemId: string;
  itemName: string;
  onSubmit: (data: CreateBOMData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const steps = [
  { id: 1, name: 'Basic Info', description: 'BOM name and details' },
  { id: 2, name: 'Components', description: 'Add materials and options' },
  { id: 3, name: 'Review', description: 'Validate and confirm' },
];

export function BOMFormWizard({ 
  itemId, 
  itemName, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: BOMFormWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [bomData, setBomData] = useState<CreateBOMData>({
    item_id: itemId,
    name: '',
    version_notes: '',
    components: [],
  });

  const { validateBOM } = useBOMValidation();

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleBasicInfoChange = (updates: Partial<CreateBOMData>) => {
    setBomData(prev => ({ ...prev, ...updates }));
  };

  const handleComponentsChange = (components: CreateBOMComponentData[]) => {
    setBomData(prev => ({ ...prev, components }));
  };

  const handleSubmit = () => {
    const validation = validateBOM(bomData);
    if (validation.isValid) {
      onSubmit(bomData);
    }
  };

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return bomData.name.trim().length > 0;
      case 2:
        return bomData.components.length > 0;
      case 3:
        return validateBOM(bomData).isValid;
      default:
        return false;
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BOMBasicInfoStep
            data={bomData}
            itemName={itemName}
            onChange={handleBasicInfoChange}
          />
        );
      case 2:
        return (
          <BOMComponentsStep
            components={bomData.components}
            onChange={handleComponentsChange}
          />
        );
      case 3:
        return (
          <BOMReviewStep
            data={bomData}
            itemName={itemName}
            validation={validateBOM(bomData)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">Create BOM for {itemName}</CardTitle>
          <Progress value={(currentStep / steps.length) * 100} className="w-full" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {steps.map((step) => {
              const status = getStepStatus(step.id);
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center">
                    <div className={`
                      flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all
                      ${status === 'completed' 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : status === 'current'
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-muted text-muted-foreground'
                      }
                    `}>
                      {status === 'completed' ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-medium">{step.id}</span>
                      )}
                    </div>
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${
                        status === 'current' ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {step.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  {step.id < steps.length && (
                    <ChevronRight className="w-5 h-5 text-muted-foreground mx-4" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {renderCurrentStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Step {currentStep} of {steps.length}
          </Badge>
          {currentStep === 3 && (
            <Badge variant="secondary">
              {validateBOM(bomData).isValid ? 'Ready to Submit' : 'Validation Required'}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isLoading}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
          )}
          
          {currentStep < steps.length ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isLoading}
              className="gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isLoading}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {isLoading ? 'Creating...' : 'Create BOM'}
              <Check className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}