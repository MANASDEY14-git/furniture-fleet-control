import { useState } from 'react';
import { Copy, Save, Trash2, FileText, Plus, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface BOMTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  components: Array<{
    materialName: string;
    quantity: number;
    unit: string;
    isCustomizable: boolean;
  }>;
  usageCount: number;
  createdAt: string;
}

// Mock template data
const mockTemplates: BOMTemplate[] = [
  {
    id: '1',
    name: 'Basic Wooden Chair',
    description: 'Standard wooden chair with basic components',
    category: 'Furniture',
    components: [
      { materialName: 'Wood Planks', quantity: 4, unit: 'pieces', isCustomizable: false },
      { materialName: 'Metal Screws', quantity: 12, unit: 'pieces', isCustomizable: false },
      { materialName: 'Wood Stain', quantity: 0.5, unit: 'liters', isCustomizable: true },
    ],
    usageCount: 15,
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Premium Sofa',
    description: 'High-end sofa with customizable fabric options',
    category: 'Furniture',
    components: [
      { materialName: 'Hardwood Frame', quantity: 1, unit: 'set', isCustomizable: false },
      { materialName: 'Fabric', quantity: 6, unit: 'meters', isCustomizable: true },
      { materialName: 'Foam Padding', quantity: 3, unit: 'pieces', isCustomizable: false },
      { materialName: 'Springs', quantity: 20, unit: 'pieces', isCustomizable: false },
    ],
    usageCount: 8,
    createdAt: '2024-01-20'
  },
  {
    id: '3',
    name: 'Coffee Table',
    description: 'Modern coffee table with glass top',
    category: 'Furniture',
    components: [
      { materialName: 'Glass Top', quantity: 1, unit: 'piece', isCustomizable: true },
      { materialName: 'Metal Legs', quantity: 4, unit: 'pieces', isCustomizable: false },
      { materialName: 'Hardware Kit', quantity: 1, unit: 'set', isCustomizable: false },
    ],
    usageCount: 12,
    createdAt: '2024-01-25'
  }
];

export function BOMTemplates() {
  const [templates, setTemplates] = useState<BOMTemplate[]>(mockTemplates);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'Furniture'
  });
  const { toast } = useToast();

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim()) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    const template: BOMTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name,
      description: newTemplate.description,
      category: newTemplate.category,
      components: [],
      usageCount: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setTemplates([...templates, template]);
    setNewTemplate({ name: '', description: '', category: 'Furniture' });
    setShowCreateDialog(false);
    
    toast({
      title: "Success",
      description: "Template created successfully",
    });
  };

  const handleUseTemplate = (template: BOMTemplate) => {
    // Update usage count
    setTemplates(templates.map(t => 
      t.id === template.id 
        ? { ...t, usageCount: t.usageCount + 1 }
        : t
    ));

    toast({
      title: "Template Applied",
      description: `${template.name} template has been applied to the current BOM`,
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(templates.filter(t => t.id !== templateId));
    toast({
      title: "Template Deleted",
      description: "Template has been removed successfully",
    });
  };

  const popularTemplates = templates
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-300">BOM Templates</h2>
          <p className="text-blue-200 text-sm">
            Pre-configured component lists to speed up BOM creation
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          
          <DialogContent className="bg-slate-800 border-blue-500/30">
            <DialogHeader>
              <DialogTitle className="text-cyan-300">Create New BOM Template</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label className="text-blue-200">Template Name</Label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="bg-slate-700/50 border-blue-500/30 text-white"
                  placeholder="e.g., Basic Wooden Chair"
                />
              </div>
              
              <div>
                <Label className="text-blue-200">Description</Label>
                <Textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  className="bg-slate-700/50 border-blue-500/30 text-white"
                  placeholder="Brief description of this template..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label className="text-blue-200">Category</Label>
                <Input
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  className="bg-slate-700/50 border-blue-500/30 text-white"
                  placeholder="e.g., Furniture, Hardware"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  className="border-blue-500/30 text-blue-200"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTemplate}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Popular Templates */}
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-300 flex items-center gap-2">
            <Star className="h-5 w-5" />
            Most Popular Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {popularTemplates.map((template) => (
              <div key={template.id} className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-white">{template.name}</h4>
                  <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-300">
                    {template.usageCount} uses
                  </Badge>
                </div>
                <p className="text-blue-200 text-sm mb-3">{template.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-blue-500/30 text-blue-300">
                    {template.components.length} components
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => handleUseTemplate(template)}
                    className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Use
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Templates */}
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-300 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Templates ({templates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-white mb-1">{template.name}</h4>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-300 text-xs">
                      {template.category}
                    </Badge>
                  </div>
                  <Badge variant="secondary" className="bg-blue-600/20 text-blue-300">
                    {template.usageCount}
                  </Badge>
                </div>
                
                <p className="text-blue-200 text-sm mb-3 line-clamp-2">
                  {template.description}
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="text-xs text-blue-300">Components:</div>
                  <div className="flex flex-wrap gap-1">
                    {template.components.slice(0, 3).map((component, index) => (
                      <Badge 
                        key={index}
                        variant="secondary" 
                        className="bg-slate-600/50 text-blue-200 text-xs"
                      >
                        {component.materialName}
                      </Badge>
                    ))}
                    {template.components.length > 3 && (
                      <Badge variant="secondary" className="bg-slate-600/50 text-blue-200 text-xs">
                        +{template.components.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-blue-300 mb-3">
                  <span>Created: {template.createdAt}</span>
                  <span>{template.components.length} components</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUseTemplate(template)}
                    className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Use Template
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-blue-200 hover:text-white hover:bg-blue-800/30"
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-800/30"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}