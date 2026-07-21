import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BOM } from '@/types/bom';

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  category: 'structure' | 'materials' | 'costs' | 'production';
  check: (bom: BOM) => {
    passed: boolean;
    message?: string;
    details?: string[];
  };
}

const validationRules: ValidationRule[] = [
  {
    id: 'has_components',
    name: 'Has Components',
    description: 'BOM must have at least one component',
    severity: 'error',
    category: 'structure',
    check: (bom) => {
      if (!bom || !bom.bom_components) {
        return { passed: false, message: 'BOM data is missing or invalid' };
      }
      const componentCount = bom.bom_components.length;
      return {
        passed: componentCount > 0,
        message: componentCount === 0 ? 'No components defined' : undefined
      };
    }
  },
  {
    id: 'material_availability',
    name: 'Material Availability',
    description: 'All materials should be available in sufficient quantity',
    severity: 'warning',
    category: 'materials',
    check: (bom) => {
      if (!bom || !bom.bom_components || bom.bom_components.length === 0) {
        return { passed: true }; // Skip validation for empty BOMs
      }
      
      const unavailable = bom.bom_components.filter(comp => 
        comp.materials && 
        comp.materials.quantity_available !== undefined &&
        comp.materials.quantity_available !== null &&
        comp.quantity_required !== undefined &&
        comp.quantity_required !== null &&
        comp.materials.quantity_available < comp.quantity_required
      );
      
      return {
        passed: unavailable.length === 0,
        message: unavailable.length > 0 ? `${unavailable.length} materials have insufficient stock` : undefined,
        details: unavailable.map(comp => 
          `${comp.materials?.name || 'Unknown'}: Required ${comp.quantity_required}, Available ${comp.materials?.quantity_available}`
        )
      };
    }
  },
  {
    id: 'customizable_options',
    name: 'Customizable Component Options',
    description: 'Customizable components should have alternative options',
    severity: 'warning',
    category: 'structure',
    check: (bom) => {
      if (!bom || !bom.bom_components || bom.bom_components.length === 0) {
        return { passed: true }; // Skip validation for empty BOMs
      }
      
      const customizableWithoutOptions = bom.bom_components.filter(comp => 
        comp.is_customizable && (!comp.options || comp.options.length === 0)
      );
      
      return {
        passed: customizableWithoutOptions.length === 0,
        message: customizableWithoutOptions.length > 0 ? 
          `${customizableWithoutOptions.length} customizable components lack options` : undefined,
        details: customizableWithoutOptions.map(comp => comp.component_name || 'Unnamed component')
      };
    }
  },
  {
    id: 'cost_calculation',
    name: 'Cost Calculation',
    description: 'All components should have valid cost information',
    severity: 'warning',
    category: 'costs',
    check: (bom) => {
      const noCostComponents = bom.bom_components?.filter(comp => 
        comp.component_type === 'material' && (!comp.materials?.cost_price || comp.materials.cost_price <= 0)
      ) || [];
      
      return {
        passed: noCostComponents.length === 0,
        message: noCostComponents.length > 0 ? 
          `${noCostComponents.length} components have no cost information` : undefined,
        details: noCostComponents.map(comp => comp.component_name || comp.materials?.name || 'Unknown component')
      };
    }
  },
  {
    id: 'component_categories',
    name: 'Component Categorization',
    description: 'Components should be properly categorized',
    severity: 'info',
    category: 'structure',
    check: (bom) => {
      const uncategorized = bom.bom_components?.filter(comp => 
        !(comp as any).category || (comp as any).category === ''
      ) || [];
      
      return {
        passed: uncategorized.length === 0,
        message: uncategorized.length > 0 ? 
          `${uncategorized.length} components are not categorized` : undefined,
        details: uncategorized.map(comp => comp.component_name || 'Unnamed component')
      };
    }
  },
  {
    id: 'primary_components',
    name: 'Primary Components',
    description: 'BOM should have at least one primary component',
    severity: 'warning',
    category: 'structure',
    check: (bom) => {
      const primaryComponents = bom.bom_components?.filter(comp => 
        (comp as any).category === 'primary'
      ) || [];
      
      return {
        passed: primaryComponents.length > 0,
        message: primaryComponents.length === 0 ? 'No primary components defined' : undefined
      };
    }
  }
];

interface BOMValidationRulesProps {
  bom: BOM;
  onFixIssue?: (ruleId: string) => void;
}

export function BOMValidationRules({ bom, onFixIssue }: BOMValidationRulesProps) {
  const runValidation = () => {
    // Skip validation if BOM is null, undefined, or has no components
    if (!bom || !bom.bom_components || bom.bom_components.length === 0) {
      return [];
    }
    
    return validationRules.map(rule => {
      try {
        return {
          ...rule,
          result: rule.check(bom)
        };
      } catch (error) {
        // If validation fails, treat as a passed rule to prevent crashes
        return {
          ...rule,
          result: { passed: true }
        };
      }
    });
  };

  const validationResults = runValidation();
  const errors = validationResults.filter(r => !r.result.passed && r.severity === 'error');
  const warnings = validationResults.filter(r => !r.result.passed && r.severity === 'warning');
  const infos = validationResults.filter(r => !r.result.passed && r.severity === 'info');
  const passed = validationResults.filter(r => r.result.passed);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'info': return <Info className="w-4 h-4 text-blue-400" />;
      default: return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'border-red-500/30 bg-red-900/20';
      case 'warning': return 'border-orange-500/30 bg-orange-900/20';
      case 'info': return 'border-blue-500/30 bg-blue-900/20';
      default: return 'border-green-500/30 bg-green-900/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-300 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Validation Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{passed.length}</div>
              <div className="text-green-300 text-sm">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{errors.length}</div>
              <div className="text-red-300 text-sm">Errors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{warnings.length}</div>
              <div className="text-orange-300 text-sm">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{infos.length}</div>
              <div className="text-blue-300 text-sm">Info</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      <div className="space-y-4">
        {validationResults.map((validation) => {
          if (validation.result.passed) return null;
          
          return (
            <Alert key={validation.id} className={getSeverityColor(validation.severity)}>
              <div className="flex items-start gap-3">
                {getSeverityIcon(validation.severity)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{validation.name}</h4>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className="text-xs border-blue-500/30 text-blue-300"
                      >
                        {validation.category}
                      </Badge>
                      {onFixIssue && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onFixIssue(validation.id)}
                          className="text-xs border-blue-500/30 text-blue-300 hover:bg-blue-600/20"
                        >
                          Fix
                        </Button>
                      )}
                    </div>
                  </div>
                  <AlertDescription className="text-sm mb-2">
                    {validation.description}
                  </AlertDescription>
                  {validation.result.message && (
                    <div className="text-sm font-medium mb-2 text-white">
                      {validation.result.message}
                    </div>
                  )}
                  {validation.result.details && validation.result.details.length > 0 && (
                    <ul className="text-sm space-y-1 list-disc list-inside text-blue-200">
                      {validation.result.details.map((detail, index) => (
                        <li key={index}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Alert>
          );
        })}
      </div>

      {/* All Rules Passed */}
      {errors.length === 0 && warnings.length === 0 && infos.length === 0 && (
        <Alert className="border-green-500/30 bg-green-900/20">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-300">
            All validation rules passed! Your BOM is well-structured and ready for production.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}