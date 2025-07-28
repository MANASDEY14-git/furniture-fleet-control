import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAttributes, useCreateAttribute, useCreateAttributeValue } from '@/hooks/useAttributes';

export default function AttributeManager() {
  const [open, setOpen] = useState(false);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [newAttributeValues, setNewAttributeValues] = useState<{ [key: string]: string }>({});

  const { data: attributes = [], isLoading } = useAttributes();
  const createAttribute = useCreateAttribute();
  const createAttributeValue = useCreateAttributeValue();

  const handleCreateAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttributeName.trim()) return;

    try {
      await createAttribute.mutateAsync(newAttributeName.trim());
      setNewAttributeName('');
    } catch (error) {
      console.error('Error creating attribute:', error);
    }
  };

  const handleCreateAttributeValue = async (attributeId: string) => {
    const value = newAttributeValues[attributeId]?.trim();
    if (!value) return;

    try {
      await createAttributeValue.mutateAsync({ attribute_id: attributeId, value });
      setNewAttributeValues(prev => ({ ...prev, [attributeId]: '' }));
    } catch (error) {
      console.error('Error creating attribute value:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-blue-300">Loading attributes...</div>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-cyan-400 border-cyan-400/50 hover:bg-cyan-900/20">
          <Plus className="w-4 h-4 mr-2" />
          Manage Attributes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl futuristic-card">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text">Manage Product Attributes</DialogTitle>
          <DialogDescription className="text-blue-300">
            Create and manage product attributes and their values for item variants.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Create New Attribute */}
          <Card className="futuristic-card">
            <CardHeader>
              <CardTitle className="text-cyan-300">Create New Attribute</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAttribute} className="flex gap-2">
                <Input
                  value={newAttributeName}
                  onChange={(e) => setNewAttributeName(e.target.value)}
                  placeholder="Attribute name (e.g., Color, Size)"
                  className="neon-border bg-slate-800/50 text-blue-100"
                />
                <Button 
                  type="submit" 
                  className="cyber-button"
                  disabled={createAttribute.isPending || !newAttributeName.trim()}
                >
                  {createAttribute.isPending ? 'Creating...' : 'Create'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing Attributes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attributes.map((attribute) => (
              <Card key={attribute.id} className="futuristic-card">
                <CardHeader>
                  <CardTitle className="text-cyan-300">{attribute.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Existing Values */}
                  <div className="flex flex-wrap gap-2">
                    {attribute.attribute_values.map((value) => (
                      <Badge key={value.id} variant="secondary" className="bg-blue-800/30 text-blue-200">
                        {value.value}
                      </Badge>
                    ))}
                  </div>

                  {/* Add New Value */}
                  <div className="flex gap-2">
                    <Input
                      value={newAttributeValues[attribute.id] || ''}
                      onChange={(e) => setNewAttributeValues(prev => ({
                        ...prev,
                        [attribute.id]: e.target.value
                      }))}
                      placeholder={`Add ${attribute.name.toLowerCase()} value`}
                      className="neon-border bg-slate-800/50 text-blue-100"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateAttributeValue(attribute.id);
                        }
                      }}
                    />
                    <Button
                      onClick={() => handleCreateAttributeValue(attribute.id)}
                      size="sm"
                      className="cyber-button"
                      disabled={createAttributeValue.isPending || !newAttributeValues[attribute.id]?.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {attributes.length === 0 && (
            <div className="text-center py-8 text-blue-300">
              No attributes found. Create your first attribute above.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
