import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CreateBOMData, CreateBOMComponentData, UpdateBOMData } from '@/types/bom';
import { ItemSelectionStep } from '../ItemSelectionStep';
import { BOMBasicInfoStep } from './wizard/BOMBasicInfoStep';
import { BOMComponentsStep } from './wizard/BOMComponentsStep';
import { BOMReviewStep } from './wizard/BOMReviewStep';
import { useBOMValidation, useEnhancedBOMByItem, useUpdateEnhancedBOM } from '@/hooks/useEnhancedBOM';

interface BOMFormWizardProps {
  itemId?: string;
  itemName?: string;
  bomId?: string;
  storeId?: string;
  isEditMode?: boolean;
  onSubmit: (data: CreateBOMData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const steps = [
  { id: 1, name: 'Select Item', description: 'Choose item for BOM' },
  { id: 2, name: 'Basic Info', description: 'BOM name and details' },
  { id: 3, name: 'Components', description: 'Add materials and options' },
  { id: 4, name: 'Review', description: 'Validate and confirm' },
];

export function BOMFormWizard({ 
  itemId, 
  itemName, 
  bomId,
  storeId,
  isEditMode = false,
  onSubmit, 
  onCancel, 
  isLoading = false 
}: BOMFormWizardProps) {
  const [currentStep, setCurrentStep] = useState(itemId ? 2 : 1); // Skip item selection if item already provided
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string } | null>(
    itemId && itemName ? { id: itemId, name: itemName } : null
  );
  const [bomData, setBomData] = useState<CreateBOMData>({
    item_id: itemId || '',
    name: '',
    version_notes: '',
    components: [],
  });

  const { validateBOM } = useBOMValidation();
  const { data: existingBOM, isLoading: isLoadingBOM } = useEnhancedBOMByItem(itemId || '');
  const updateBOM = useUpdateEnhancedBOM();

  // Load existing BOM data when in edit mode
  useEffect(() => {
    if (isEditMode && existingBOM && existingBOM.item_id === itemId) {
      setBomData({
        item_id: existingBOM.item_id,
        name: existingBOM.name || '',
        version_notes: existingBOM.version_notes || '',
        components: existingBOM.bom_components?.map(comp => ({
          component_type: comp.component_type,
          material_id: comp.material_id || undefined,
          labor_category_id: comp.labor_category_id || undefined,
          quantity_required: comp.quantity_required,
          component_name: comp.component_name || undefined,
          is_customizable: comp.is_customizable || false,
          notes: comp.notes || undefined,
          service_cost: comp.service_cost || undefined,
          hourly_rate: comp.hourly_rate || undefined,
          time_hours: comp.time_hours || undefined,
          time_minutes: comp.time_minutes || undefined,
          options: comp.bom_component_options?.map(opt => ({
            option_name: opt.option_name,
            material_id: opt.material_id || undefined,
          })) || [],
        })) || [],
      });
    }
  }, [isEditMode, existingBOM, itemId]);

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

  const handleItemSelect = (item: { id: string; name: string }) => {
    setSelectedItem(item);
    setBomData(prev => ({ ...prev, item_id: item.id }));
    setCurrentStep(2);
  };

  const handleBasicInfoChange = (updates: Partial<CreateBOMData>) => {
    setBomData(prev => ({ ...prev, ...updates }));
  };

  const handleComponentsChange = (components: CreateBOMComponentData[]) => {
    setBomData(prev => ({ ...prev, components }));
  };

  const handleSubmit = async () => {
    const validation = validateBOM(bomData);
    if (validation.isValid) {
      if (isEditMode && bomId) {
        try {
          const updateData: UpdateBOMData = {
            bomId: bomId,
            itemId: bomData.item_id,
            name: bomData.name,
            version_notes: bomData.version_notes,
            components: bomData.components,
          };
          await updateBOM.mutateAsync(updateData);
          onSubmit(bomData);
        } catch (error) {
          console.error('Error updating BOM:', error);
        }
      } else {
        onSubmit(bomData);
      }
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
        return selectedItem !== null;
      case 2:
        return bomData.name.trim().length > 0;
      case 3:
        return bomData.components.length > 0;
      case 4:
        return validateBOM(bomData).isValid;
      default:
        return false;
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ItemSelectionStep
            onItemSelect={handleItemSelect}
            storeId={storeId}
          />
        );
      case 2:
        return (
          <BOMBasicInfoStep
            data={bomData}
            itemName={selectedItem?.name || ''}
            onChange={handleBasicInfoChange}
          />
        );
      case 3:
        return (
          <BOMComponentsStep
            components={bomData.components}
            onChange={handleComponentsChange}
          />
        );
      case 4:
        return (
          <BOMReviewStep
            data={bomData}
            itemName={selectedItem?.name || ''}
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
          <CardTitle className="text-primary">
            {currentStep === 1 
              ? (isEditMode ? 'Edit BOM' : 'Create New BOM') 
              : `${isEditMode ? 'Edit' : 'Create'} BOM for ${selectedItem?.name || itemName}`
            }
          </CardTitle>
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
          {(isEditMode && isLoadingBOM) ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading BOM data...</div>
            </div>
          ) : (
            renderCurrentStep()
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Step {currentStep} of {steps.length}
          </Badge>
          {currentStep === 4 && (
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
              disabled={!canProceed() || isLoading || updateBOM.isPending}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {isLoading || updateBOM.isPending 
                ? (isEditMode ? 'Updating...' : 'Creating...') 
                : (isEditMode ? 'Update BOM' : 'Create BOM')
              }
              <Check className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}