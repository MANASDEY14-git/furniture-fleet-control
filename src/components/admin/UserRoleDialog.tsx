import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateUserRole } from '@/hooks/useAllUsers';

const AVAILABLE_ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features and settings' },
  { value: 'manager', label: 'Manager', description: 'Can manage stores, inventory, and staff' },
  { value: 'accountant', label: 'Accountant', description: 'Access to financial data and reports' },
  { value: 'sales_representative', label: 'Sales Representative', description: 'Can create sales and view customer data' },
  { value: 'employee', label: 'Employee', description: 'Basic access to assigned stores' },
];

interface UserRoleDialogProps {
  userId: string | null;
  currentRole: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserRoleDialog({
  userId,
  currentRole,
  open,
  onOpenChange,
}: UserRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const updateRole = useUpdateUserRole();

  useEffect(() => {
    setSelectedRole(currentRole);
  }, [currentRole, open]);

  const handleSave = () => {
    if (!userId || selectedRole === currentRole) return;
    
    updateRole.mutate(
      { userId, newRole: selectedRole },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  const selectedRoleInfo = AVAILABLE_ROLES.find(r => r.value === selectedRole);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="futuristic-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Change User Role
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-blue-200 mb-2 block">
              Select Role
            </label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="bg-slate-800 border-blue-500/30">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRoleInfo && (
            <div className="bg-blue-900/20 rounded-lg p-3">
              <p className="text-sm text-blue-300">{selectedRoleInfo.description}</p>
            </div>
          )}

          {selectedRole === 'admin' && selectedRole !== currentRole && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-300">
                <strong>Warning:</strong> Admins have full system access including the ability to manage other users and all data.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={selectedRole === currentRole || updateRole.isPending}
            className="cyber-button"
          >
            {updateRole.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
