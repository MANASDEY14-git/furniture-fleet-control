import { useState } from 'react';
import { Clock, GitBranch, FileText, Plus, Eye, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { BOM } from '@/types/bom';

interface BOMVersionManagementProps {
  bom: BOM;
  onCreateVersion?: (notes: string) => void;
  onRestoreVersion?: (versionId: string) => void;
}

interface BOMVersion {
  id: string;
  version: number;
  created_at: string;
  created_by: string;
  version_notes: string;
  changes_summary: string;
  component_count: number;
  estimated_cost: number;
  is_current: boolean;
}

export function BOMVersionManagement({ bom, onCreateVersion, onRestoreVersion }: BOMVersionManagementProps) {
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [showVersionDetails, setShowVersionDetails] = useState<BOMVersion | null>(null);
  const [versionNotes, setVersionNotes] = useState('');
  const { toast } = useToast();

  // Mock version history - In real implementation, this would come from the database
  const versions: BOMVersion[] = [
    {
      id: bom.id || '',
      version: bom.version || 1,
      created_at: new Date().toISOString(),
      created_by: 'Current User',
      version_notes: bom.version_notes || 'Current version',
      changes_summary: 'Active version',
      component_count: bom.bom_components?.length || 0,
      estimated_cost: bom.estimated_cost || 0,
      is_current: true
    },
    // Mock previous versions
    ...Array.from({ length: Math.max(0, (bom.version || 1) - 1) }, (_, i) => ({
      id: `${bom.id}-v${bom.version! - i - 1}`,
      version: (bom.version || 1) - i - 1,
      created_at: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
      created_by: 'System User',
      version_notes: `Version ${(bom.version || 1) - i - 1} notes`,
      changes_summary: `Updated ${Math.floor(Math.random() * 5) + 1} components`,
      component_count: Math.max(1, (bom.bom_components?.length || 0) - Math.floor(Math.random() * 3)),
      estimated_cost: (bom.estimated_cost || 0) * (0.8 + Math.random() * 0.4),
      is_current: false
    }))
  ].sort((a, b) => b.version - a.version);

  const handleCreateVersion = () => {
    if (versionNotes.trim()) {
      onCreateVersion?.(versionNotes);
      setVersionNotes('');
      setShowCreateVersion(false);
      toast({
        title: "New Version Created",
        description: `Version ${(bom.version || 1) + 1} has been created`,
      });
    }
  };

  const handleRestoreVersion = (version: BOMVersion) => {
    if (confirm(`Are you sure you want to restore to version ${version.version}? This will create a new version with the restored content.`)) {
      onRestoreVersion?.(version.id);
      toast({
        title: "Version Restored",
        description: `Version ${version.version} has been restored as a new version`,
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Version Management</h3>
          <p className="text-blue-200 text-sm">Track and manage BOM versions with detailed change history</p>
        </div>
        <Button 
          onClick={() => setShowCreateVersion(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Version
        </Button>
      </div>

      {/* Current Version Summary */}
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-300 flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Current Version: v{bom.version || 1}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <span className="text-blue-200 text-sm">Last Updated</span>
              <p className="text-white font-medium">{formatDate(bom.updated_at || new Date().toISOString())}</p>
            </div>
            <div>
              <span className="text-blue-200 text-sm">Components</span>
              <p className="text-white font-medium">{bom.bom_components?.length || 0}</p>
            </div>
            <div>
              <span className="text-blue-200 text-sm">Estimated Cost</span>
              <p className="text-white font-medium">₹{(bom.estimated_cost || 0).toFixed(2)}</p>
            </div>
            <div>
              <span className="text-blue-200 text-sm">Status</span>
              <Badge className="bg-green-600">Current</Badge>
            </div>
          </div>
          {bom.version_notes && (
            <div className="mt-4 p-3 bg-slate-700/30 rounded border border-blue-500/20">
              <p className="text-blue-200 text-sm">{bom.version_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Version History */}
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-300 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {versions.map((version) => (
              <div key={version.id} className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant={version.is_current ? "default" : "secondary"}>
                      v{version.version}
                    </Badge>
                    <div>
                      <h4 className="font-medium text-white">
                        {version.is_current ? 'Current Version' : `Version ${version.version}`}
                      </h4>
                      <p className="text-sm text-blue-200">
                        {formatDate(version.created_at)} by {version.created_by}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowVersionDetails(version)}
                      className="text-blue-200 hover:bg-blue-800/30"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {!version.is_current && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreVersion(version)}
                        className="border-blue-500/30 text-blue-200 hover:bg-blue-800/30"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-200">Components:</span>
                    <span className="text-white ml-2">{version.component_count}</span>
                  </div>
                  <div>
                    <span className="text-blue-200">Cost:</span>
                    <span className="text-white ml-2">₹{version.estimated_cost.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-blue-200">Changes:</span>
                    <span className="text-white ml-2">{version.changes_summary}</span>
                  </div>
                </div>

                {version.version_notes && (
                  <div className="mt-3 p-2 bg-slate-600/30 rounded text-sm text-blue-200">
                    <FileText className="w-4 h-4 inline mr-1" />
                    {version.version_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Version Dialog */}
      <Dialog open={showCreateVersion} onOpenChange={setShowCreateVersion}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New BOM Version</DialogTitle>
            <DialogDescription>
              Create a new version of this BOM with updated components or configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="version-notes">Version Notes</Label>
              <Textarea
                id="version-notes"
                placeholder="Describe the changes in this version..."
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateVersion(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateVersion}
                disabled={!versionNotes.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Version
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version Details Dialog */}
      <Dialog open={!!showVersionDetails} onOpenChange={() => setShowVersionDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version {showVersionDetails?.version} Details</DialogTitle>
            <DialogDescription>
              Detailed information about this BOM version.
            </DialogDescription>
          </DialogHeader>
          {showVersionDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Created</Label>
                  <p className="text-sm">{formatDate(showVersionDetails.created_at)}</p>
                </div>
                <div>
                  <Label>Created By</Label>
                  <p className="text-sm">{showVersionDetails.created_by}</p>
                </div>
                <div>
                  <Label>Components</Label>
                  <p className="text-sm">{showVersionDetails.component_count}</p>
                </div>
                <div>
                  <Label>Estimated Cost</Label>
                  <p className="text-sm">₹{showVersionDetails.estimated_cost.toFixed(2)}</p>
                </div>
              </div>
              <div>
                <Label>Changes Summary</Label>
                <p className="text-sm">{showVersionDetails.changes_summary}</p>
              </div>
              <div>
                <Label>Version Notes</Label>
                <div className="p-3 bg-slate-100 rounded text-sm">
                  {showVersionDetails.version_notes || 'No notes provided'}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}