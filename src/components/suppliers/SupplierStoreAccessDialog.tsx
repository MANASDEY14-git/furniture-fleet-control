import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useSupplierStoreAccess } from '@/hooks/useCommandCenter';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useStores } from '@/hooks/useStores';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';

interface SupplierStoreAccessDialogProps {
  trigger?: React.ReactNode;
}

export function SupplierStoreAccessDialog({ trigger }: SupplierStoreAccessDialogProps) {
  const { data: mappings = [], isLoading, grantAccess, revokeAccess, isGranting, isRevoking, refetch } = useSupplierStoreAccess();
  const { data: suppliers = [] } = useSuppliers();
  const { data: stores = [] } = useStores();
  const { data: roleData } = useCurrentUserRole();

  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  const isAdmin = roleData?.isAdmin;

  const handleGrant = async () => {
    if (!selectedSupplier || !selectedStore) return;
    try {
      await grantAccess({ supplierId: selectedSupplier, storeId: selectedStore });
      setSelectedSupplier('');
      setSelectedStore('');
    } catch (err) {}
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeAccess(id);
    } catch (err) {}
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <KeyRound className="w-4 h-4 mr-2" />
            Manage Access Mappings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                Supplier Store Access Map
              </DialogTitle>
              <DialogDescription>
                Map suppliers to specific store outlets to manage data access scoping.
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh list" className="h-8 w-8">
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
        </DialogHeader>

        {/* Admin Grant Form */}
        {isAdmin && (
          <div className="p-3 bg-muted/40 border rounded-lg flex flex-col sm:flex-row items-end gap-3 mt-2">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Supplier</label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier} disabled={isGranting}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Store Outlet</label>
              <Select value={selectedStore} onValueChange={setSelectedStore} disabled={isGranting}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Store Outlet" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((st) => (
                    <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGrant}
              disabled={!selectedSupplier || !selectedStore || isGranting}
              className="h-9 font-semibold text-xs shrink-0"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Mapping
            </Button>
          </div>
        )}

        {/* Mapping List Table */}
        <div className="flex-1 overflow-y-auto mt-4 border rounded-lg">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Loading access mappings...
            </div>
          ) : mappings.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No store-supplier access mappings found in the system.
            </div>
          ) : (
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Created At</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-semibold text-foreground">
                      {m.suppliers?.name || 'Unknown Supplier'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.stores?.name || 'Unknown Store'}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-[10px]">
                      {new Date(m.created_at).toLocaleDateString()}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                          disabled={isRevoking}
                          onClick={() => handleRevoke(m.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
