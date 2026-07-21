import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { BOMValidationResult } from '@/types/bom';

interface BOMValidationProps {
  validation: BOMValidationResult;
  className?: string;
}

export function BOMValidation({ validation, className = '' }: BOMValidationProps) {
  if (validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0) {
    return (
      <Alert className={`border-green-500/30 bg-green-900/20 ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-400" />
        <AlertDescription className="text-green-300">
          BOM validation passed successfully.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {validation.errors.length > 0 && (
        <Alert className="border-red-500/30 bg-red-900/20">
          <XCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            <div className="font-semibold mb-2 flex items-center gap-2">
              Critical Issues
              <Badge variant="destructive" className="text-xs">
                {validation.errors.length}
              </Badge>
            </div>
            <ul className="list-disc list-inside space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert className="border-orange-500/30 bg-orange-900/20">
          <AlertTriangle className="h-4 w-4 text-orange-400" />
          <AlertDescription className="text-orange-300">
            <div className="font-semibold mb-2 flex items-center gap-2">
              Warnings
              <Badge variant="secondary" className="text-xs bg-orange-400/20 text-orange-300">
                {validation.warnings.length}
              </Badge>
            </div>
            <ul className="list-disc list-inside space-y-1">
              {validation.warnings.map((warning, index) => (
                <li key={index} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}