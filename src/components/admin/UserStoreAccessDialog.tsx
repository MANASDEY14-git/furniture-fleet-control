import { useState } from 'react';
import { Plus, Trash2, Store } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStores } from '@/hooks/useStores';
import {
  useUserStoreAccessDetails,
  useGrantStoreAccess,
  useRevokeStoreAccess,
} from '@/hooks/useAllUsers';

interface UserStoreAccessDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserStoreAccessDialog({
  userId,
  open,
  onOpenChange,
}: UserStoreAccessDialogProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const { data: stores = [] } = useStores();
  const { data: userAccess = [], isLoading } = useUserStoreAccessDetails(userId || undefined);
  const grantAccess = useGrantStoreAccess();
  const revokeAccess = useRevokeStoreAccess();

  const userAccessStoreIds = userAccess.map(a => a.store_id);
  const availableStores = stores.filter(s => !userAccessStoreIds.includes(s.id));

  const handleGrantAccess = () => {
    if (!userId || !selectedStoreId) return;
    
    grantAccess.mutate(
      { userId, storeId: selectedStoreId },
      {
        onSuccess: () => setSelectedStoreId(''),
      }
    );
  };

  const handleRevokeAccess = (accessId: string) => {
    revokeAccess.mutate(accessId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="futuristic-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 flex items-center gap-2">
            <Store className="w-5 h-5" />
            Manage Store Access
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Access */}
          <div>
            <h4 className="text-sm font-medium text-blue-200 mb-2">Current Access</h4>
            {isLoading ? (
              <p className="text-blue-300 text-sm">Loading...</p>
            ) : userAccess.length === 0 ? (
              <p className="text-amber-400 text-sm">No store access granted yet.</p>
            ) : (
              <div className="space-y-2">
                {userAccess.map(access => (
                  <div
                    key={access.id}
                    className="flex items-center justify-between p-2 bg-blue-900/20 rounded-lg"
                  >
                    <div>
                      <p className="text-blue-100 font-medium">{access.store_name}</p>
                      <p className="text-blue-300 text-xs">{access.store_location}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      onClick={() => handleRevokeAccess(access.id)}
                      disabled={revokeAccess.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grant New Access */}
          {availableStores.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-blue-200 mb-2">Grant New Access</h4>
              <div className="flex gap-2">
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger className="flex-1 bg-slate-800 border-blue-500/30">
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStores.map(store => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name} - {store.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleGrantAccess}
                  disabled={!selectedStoreId || grantAccess.isPending}
                  className="cyber-button"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {availableStores.length === 0 && userAccess.length > 0 && (
            <p className="text-sm text-blue-300">
              User has access to all available stores.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
