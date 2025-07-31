import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateBOMData } from '@/types/bom';
import { Package } from 'lucide-react';

interface BOMBasicInfoStepProps {
  data: CreateBOMData;
  itemName: string;
  onChange: (updates: Partial<CreateBOMData>) => void;
}

export function BOMBasicInfoStep({ data, itemName, onChange }: BOMBasicInfoStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4">
          <Package className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
        <p className="text-sm text-muted-foreground">
          Configure the basic details for your BOM
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">BOM Details for {itemName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bomName" className="text-sm font-medium">
              BOM Name *
            </Label>
            <Input
              id="bomName"
              placeholder="e.g., Premium Office Chair BOM v1"
              value={data.name || ''}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Give your BOM a descriptive name for easy identification
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="versionNotes" className="text-sm font-medium">
              Version Notes (Optional)
            </Label>
            <Textarea
              id="versionNotes"
              placeholder="Describe what makes this version unique..."
              value={data.version_notes || ''}
              onChange={(e) => onChange({ version_notes: e.target.value })}
              rows={3}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Add notes about this version for future reference
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}