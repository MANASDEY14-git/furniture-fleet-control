import React, { useState } from 'react';
import { Plus, Package2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMaterials } from '@/hooks/useMaterials';
import MaterialForm from '@/components/MaterialForm';
import MaterialStockMovementsDialog from '@/components/MaterialStockMovementsDialog';

export default function Materials() {
  const { data: materials = [], isLoading } = useMaterials();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cyan-300 glow-text">Raw Materials</h1>
          <p className="text-blue-200">Manage your raw materials inventory</p>
        </div>
        <MaterialForm
          trigger={
            <Button className="cyber-button text-white font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Add Material
            </Button>
          }
        />
      </div>

      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text flex items-center">
            <Package2 className="w-5 h-5 mr-2" />
            Materials Database
          </CardTitle>
          <div className="mt-4">
            <Input
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Name</TableHead>
                  <TableHead className="text-blue-200">Unit</TableHead>
                  <TableHead className="text-blue-200">Stock Available</TableHead>
                  <TableHead className="text-blue-200">Cost Price</TableHead>
                  <TableHead className="text-blue-200">Total Value</TableHead>
                  <TableHead className="text-blue-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-blue-300">
                      Loading materials...
                    </TableCell>
                  </TableRow>
                ) : filteredMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-blue-300">
                      No materials found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map((material) => (
                    <TableRow key={material.id} className="border-blue-500/20 hover:bg-blue-900/20">
                      <TableCell className="font-medium text-blue-100">{material.name}</TableCell>
                      <TableCell className="text-blue-200">{material.unit || 'Units'}</TableCell>
                      <TableCell className="text-blue-200">{material.quantity_available}</TableCell>
                      <TableCell className="text-blue-200">₹{material.cost_price}</TableCell>
                      <TableCell className="text-blue-200">
                        ₹{(material.quantity_available * material.cost_price).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <MaterialForm
                            material={material}
                            trigger={
                              <Button variant="outline" size="sm" className="neon-border bg-slate-800/50 text-blue-100">
                                Edit
                              </Button>
                            }
                          />
                          <MaterialStockMovementsDialog
                            material={material}
                            trigger={
                              <Button variant="outline" size="sm" className="neon-border bg-slate-800/50 text-blue-100">
                                <Activity className="w-4 h-4" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}