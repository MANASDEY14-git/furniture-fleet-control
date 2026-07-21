import React, { useState, useEffect } from 'react';
import { Plus, Package2, Search, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMaterials, Material } from '@/hooks/useMaterials';
import MaterialForm from '@/components/MaterialForm';
import MaterialListCard from './MaterialListCard';
import MaterialDetailPanel from './MaterialDetailPanel';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { cn } from '@/lib/utils';

export default function MaterialWorkspace() {
  const { data: materials = [], isLoading } = useMaterials();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('materials-workspace')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'materials'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['materials'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Auto-select first material on desktop
  useEffect(() => {
    if (!isMobile && materials.length > 0 && !selectedMaterial) {
      setSelectedMaterial(materials[0]);
    }
  }, [materials, selectedMaterial, isMobile]);

  // Update selected material when data changes
  useEffect(() => {
    if (selectedMaterial) {
      const updated = materials.find(m => m.id === selectedMaterial.id);
      if (updated) {
        setSelectedMaterial(updated);
      }
    }
  }, [materials, selectedMaterial]);

  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['materials'] });
  };

  // Mobile Layout
  if (isMobile) {
    if (selectedMaterial) {
      return (
        <div className="h-full">
          <MaterialDetailPanel
            material={selectedMaterial}
            onBack={() => setSelectedMaterial(null)}
            isMobile={true}
          />
        </div>
      );
    }

    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-4 p-4">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold glow-text">Materials</h1>
            <p className="text-muted-foreground text-sm">Inventory Management</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading materials...</p>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No materials found</p>
              </div>
            ) : (
              filteredMaterials.map((material) => (
                <MaterialListCard
                  key={material.id}
                  material={material}
                  isSelected={false}
                  onClick={() => setSelectedMaterial(material)}
                  compact={false}
                />
              ))
            )}
          </div>

          <div className="fixed bottom-6 right-6 z-50">
            <MaterialForm
              trigger={
                <Button size="lg" className="rounded-full h-14 w-14 shadow-2xl">
                  <Plus className="w-6 h-6" />
                </Button>
              }
            />
          </div>
        </div>
      </PullToRefresh>
    );
  }

  // Desktop Layout - Master-Detail
  return (
    <div className="h-[calc(100vh-80px)] flex gap-4">
      {/* Left Panel - Material List */}
      {!isExpanded && (
        <div className="w-[280px] flex-shrink-0 flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Materials</h1>
            <MaterialForm
              trigger={
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
              }
            />
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-2">
              {isLoading ? (
                <p className="text-center py-4 text-muted-foreground text-sm">Loading...</p>
              ) : filteredMaterials.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground text-sm">No materials found</p>
              ) : (
                filteredMaterials.map((material) => (
                  <MaterialListCard
                    key={material.id}
                    material={material}
                    isSelected={selectedMaterial?.id === material.id}
                    onClick={() => setSelectedMaterial(material)}
                    compact={true}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Right Panel - Material Detail */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        selectedMaterial && "opacity-100",
        !selectedMaterial && "opacity-60"
      )}>
        {selectedMaterial ? (
          <>
            <div className="flex items-center justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? (
                  <>
                    <Minimize2 className="w-4 h-4 mr-1" />
                    Collapse
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 mr-1" />
                    Expand
                  </>
                )}
              </Button>
            </div>
            <MaterialDetailPanel
              material={selectedMaterial}
              isMobile={false}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Package2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Select a material to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
