import { Plus, Pencil, Trash2, Settings as SettingsIcon, Building2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useStores, useDeleteStore } from '@/hooks/useStores';
import { useCategories, useDeleteCategory } from '@/hooks/useCategories';
import { useAllBankAccounts, useDeleteBankAccount } from '@/hooks/useBankAccounts';
import { useLaborCategories, useDeleteLaborCategory } from '@/hooks/useLaborCategories';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import StoreForm from '@/components/StoreForm';
import CategoryForm from '@/components/CategoryForm';
import LaborCategoryForm from '@/components/LaborCategoryForm';
import UserManagementCard from '@/components/admin/UserManagementCard';
import BankAccountForm from '@/components/BankAccountForm';
import { formatCurrency } from '@/utils/currencyUtils';

export default function Settings() {
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: bankAccounts = [], isLoading: bankAccountsLoading } = useAllBankAccounts();
  const { data: laborCategories = [], isLoading: laborCategoriesLoading } = useLaborCategories();
  const { data: roleData } = useCurrentUserRole();
  const deleteStore = useDeleteStore();
  const deleteCategory = useDeleteCategory();
  const deleteBankAccount = useDeleteBankAccount();
  const deleteLaborCategory = useDeleteLaborCategory();

  const isAdmin = roleData?.isAdmin;

  const handleDeleteStore = (id: string) => {
    deleteStore.mutate(id);
  };

  const handleDeleteCategory = (id: string) => {
    deleteCategory.mutate(id);
  };

  const handleDeleteBankAccount = (id: string) => {
    deleteBankAccount.mutate(id);
  };

  const handleDeleteLaborCategory = (id: string) => {
    deleteLaborCategory.mutate(id);
  };

  const getStoreName = (storeId: string) => {
    return stores.find(s => s.id === storeId)?.name || 'Unknown Store';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-cyan-400" />
        <div>
        <h1 className="text-3xl font-bold glow-text">System Configuration</h1>
          <p className="text-blue-300">Manage stores, categories, bank accounts, and labor categories</p>
        </div>
      </div>

      {/* User Management - Admin Only */}
      {isAdmin && <UserManagementCard />}

      {/* Stores Management */}
      <Card className="futuristic-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-cyan-300 glow-text">Store Registry</CardTitle>
          {isAdmin && (
            <StoreForm
              trigger={
                <Button className="cyber-button font-semibold text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Store
                </Button>
              }
            />
          )}
        </CardHeader>
        <CardContent>
          {storesLoading ? (
            <div className="text-center py-8">
              <p className="text-blue-300">Loading stores...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="data-grid">
                <TableHeader>
                  <TableRow className="border-blue-500/30">
                    <TableHead className="text-blue-200">Name</TableHead>
                    <TableHead className="text-blue-200">Location</TableHead>
                    {isAdmin && <TableHead className="text-right text-blue-200">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map(store => (
                    <TableRow key={store.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                      <TableCell className="font-medium text-blue-100">{store.name}</TableCell>
                      <TableCell className="text-blue-200">{store.location}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <StoreForm
                              store={store}
                              trigger={
                                <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20">
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              }
                            />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="futuristic-card">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-cyan-300">Delete Store</AlertDialogTitle>
                                  <AlertDialogDescription className="text-blue-200">
                                    Are you sure you want to delete "{store.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-700 text-blue-100 border-blue-500/30 hover:bg-slate-600">Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteStore(store.id)} className="bg-red-600 hover:bg-red-700 text-white">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {stores.length === 0 && !storesLoading && (
            <div className="text-center py-8">
              <p className="text-blue-300">
                {isAdmin ? 'No stores found. Add your first store above.' : 'No stores assigned to your account.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Accounts Management */}
      <Card className="futuristic-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Bank Accounts
          </CardTitle>
          <BankAccountForm
            trigger={
              <Button className="cyber-button font-semibold text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Bank Account
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          {bankAccountsLoading ? (
            <div className="text-center py-8">
              <p className="text-blue-300">Loading bank accounts...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="data-grid">
                <TableHeader>
                  <TableRow className="border-blue-500/30">
                    <TableHead className="text-blue-200">Account Name</TableHead>
                    <TableHead className="text-blue-200">Bank</TableHead>
                    <TableHead className="text-blue-200">Account Number</TableHead>
                    <TableHead className="text-blue-200">Type</TableHead>
                    <TableHead className="text-blue-200">Store</TableHead>
                    <TableHead className="text-blue-200 text-right">Current Balance</TableHead>
                    <TableHead className="text-right text-blue-200">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankAccounts.map(account => (
                    <TableRow key={account.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                      <TableCell className="font-medium text-blue-100">{account.account_name}</TableCell>
                      <TableCell className="text-blue-200">
                        <div>
                          <span>{account.bank_name}</span>
                          {account.branch_name && (
                            <span className="text-xs block text-blue-400">{account.branch_name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-blue-200 font-mono">
                        ****{account.account_number.slice(-4)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {account.account_type || 'savings'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {account.stores?.name || getStoreName(account.store_id)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-cyan-300">
                        {formatCurrency(account.current_balance || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <BankAccountForm
                            bankAccount={account}
                            trigger={
                              <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            }
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="futuristic-card">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-cyan-300">Delete Bank Account</AlertDialogTitle>
                                <AlertDialogDescription className="text-blue-200">
                                  Are you sure you want to delete "{account.account_name}"? This will hide the account but keep transaction history.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-slate-700 text-blue-100 border-blue-500/30 hover:bg-slate-600">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteBankAccount(account.id)} className="bg-red-600 hover:bg-red-700 text-white">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {bankAccounts.length === 0 && !bankAccountsLoading && (
            <div className="text-center py-8">
              <p className="text-blue-300">No bank accounts found. Add your first bank account above.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories Management */}
      <Card className="futuristic-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-cyan-300 glow-text">Category Database</CardTitle>
          <CategoryForm
            trigger={
              <Button className="cyber-button font-semibold text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          {categoriesLoading ? (
            <div className="text-center py-8">
              <p className="text-blue-300">Loading categories...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="data-grid">
                <TableHeader>
                  <TableRow className="border-blue-500/30">
                    <TableHead className="text-blue-200">Name</TableHead>
                    <TableHead className="text-right text-blue-200">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map(category => (
                    <TableRow key={category.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                      <TableCell className="font-medium text-blue-100">{category.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <CategoryForm
                            category={category}
                            trigger={
                              <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            }
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="futuristic-card">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-cyan-300">Delete Category</AlertDialogTitle>
                                <AlertDialogDescription className="text-blue-200">
                                  Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-slate-700 text-blue-100 border-blue-500/30 hover:bg-slate-600">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCategory(category.id)} className="bg-red-600 hover:bg-red-700 text-white">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {categories.length === 0 && !categoriesLoading && (
            <div className="text-center py-8">
              <p className="text-blue-300">No categories found. Add your first category above.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Labor Categories Management */}
      <Card className="futuristic-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Labor Categories
          </CardTitle>
          <LaborCategoryForm
            trigger={
              <Button className="cyber-button font-semibold text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Labor Category
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          {laborCategoriesLoading ? (
            <div className="text-center py-8">
              <p className="text-blue-300">Loading labor categories...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="data-grid">
                <TableHeader>
                  <TableRow className="border-blue-500/30">
                    <TableHead className="text-blue-200">Name</TableHead>
                    <TableHead className="text-blue-200">Description</TableHead>
                    <TableHead className="text-blue-200 text-right">Hourly Rate</TableHead>
                    <TableHead className="text-right text-blue-200">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {laborCategories.map(category => (
                    <TableRow key={category.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                      <TableCell className="font-medium text-blue-100">{category.name}</TableCell>
                      <TableCell className="text-blue-200">{category.description || '-'}</TableCell>
                      <TableCell className="text-right font-semibold text-cyan-300">
                        {formatCurrency(category.default_hourly_rate)}/hr
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <LaborCategoryForm
                            laborCategory={category}
                            trigger={
                              <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            }
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="futuristic-card">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-cyan-300">Delete Labor Category</AlertDialogTitle>
                                <AlertDialogDescription className="text-blue-200">
                                  Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-slate-700 text-blue-100 border-blue-500/30 hover:bg-slate-600">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteLaborCategory(category.id)} className="bg-red-600 hover:bg-red-700 text-white">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {laborCategories.length === 0 && !laborCategoriesLoading && (
            <div className="text-center py-8">
              <p className="text-blue-300">No labor categories found. Add your first labor category above.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
