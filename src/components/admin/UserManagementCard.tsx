import { useState } from 'react';
import { Users, Store, Shield, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAllUsers } from '@/hooks/useAllUsers';
import UserStoreAccessDialog from './UserStoreAccessDialog';
import UserRoleDialog from './UserRoleDialog';

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'manager':
      return 'default';
    case 'accountant':
      return 'secondary';
    case 'sales_representative':
      return 'outline';
    default:
      return 'secondary';
  }
};

const formatRole = (role: string) => {
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function UserManagementCard() {
  const { data: users = [], isLoading, error } = useAllUsers();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [storeAccessDialogOpen, setStoreAccessDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const pendingUsers = users.filter(u => u.store_count === 0 && u.role !== 'admin');

  if (error) {
    return (
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-400">
            Access denied or error loading users. Only admins can view this section.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingUsers.length > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <UserPlus className="w-4 h-4" />
                <span className="font-medium">
                  {pendingUsers.length} user{pendingUsers.length > 1 ? 's' : ''} pending store access
                </span>
              </div>
              <p className="text-sm text-amber-300/70">
                These users have signed up but cannot access any data until you assign them to a store.
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-blue-300">Loading users...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="data-grid">
                <TableHeader>
                  <TableRow className="border-blue-500/30">
                    <TableHead className="text-blue-200">User</TableHead>
                    <TableHead className="text-blue-200">Role</TableHead>
                    <TableHead className="text-blue-200">Stores</TableHead>
                    <TableHead className="text-right text-blue-200">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow 
                      key={user.user_id} 
                      className={`border-blue-500/20 hover:bg-blue-800/20 transition-colors ${
                        user.store_count === 0 && user.role !== 'admin' ? 'bg-amber-900/10' : ''
                      }`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-blue-100">
                            {user.first_name || user.last_name 
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                              : 'No name'}
                          </p>
                          <p className="text-sm text-blue-300">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {formatRole(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <span className="text-cyan-400">All stores</span>
                        ) : user.store_count === 0 ? (
                          <span className="text-amber-400">No access</span>
                        ) : (
                          <span className="text-blue-200">{user.store_count} store(s)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
                            onClick={() => {
                              setSelectedUserId(user.user_id);
                              setStoreAccessDialogOpen(true);
                            }}
                          >
                            <Store className="w-4 h-4 mr-1" />
                            Stores
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                            onClick={() => {
                              setSelectedUserId(user.user_id);
                              setRoleDialogOpen(true);
                            }}
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            Role
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {users.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-blue-300">No users found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <UserStoreAccessDialog
        userId={selectedUserId}
        open={storeAccessDialogOpen}
        onOpenChange={setStoreAccessDialogOpen}
      />

      <UserRoleDialog
        userId={selectedUserId}
        currentRole={users.find(u => u.user_id === selectedUserId)?.role || 'employee'}
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
      />
    </>
  );
}
