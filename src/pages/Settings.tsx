
import { Plus, Pencil, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useStores, useDeleteStore } from '@/hooks/useStores';
import { useCategories, useDeleteCategory } from '@/hooks/useCategories';
import StoreForm from '@/components/StoreForm';
import CategoryForm from '@/components/CategoryForm';

export default function Settings() {
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const deleteStore = useDeleteStore();
  const deleteCategory = useDeleteCategory();

  const handleDeleteStore = (id: string) => {
    deleteStore.mutate(id);
  };

  const handleDeleteCategory = (id: string) => {
    deleteCategory.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-cyan-400" />
        <div>
          <h1 className="text-3xl font-bold glow-text">System Configuration</h1>
          <p className="text-blue-300">Manage stores and categories</p>
        </div>
      </div>

      {/* Stores Management */}
      <Card className="futuristic-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-cyan-300 glow-text">Store Registry</CardTitle>
          <StoreForm
            trigger={
              <Button className="cyber-button text-white font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Add Store
              </Button>
            }
          />
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
                    <TableHead className="text-right text-blue-200">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((store) => (
                    <TableRow key={store.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                      <TableCell className="font-medium text-blue-100">{store.name}</TableCell>
                      <TableCell className="text-blue-200">{store.location}</TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {stores.length === 0 && !storesLoading && (
            <div className="text-center py-8">
              <p className="text-blue-300">No stores found. Add your first store above.</p>
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
              <Button className="cyber-button text-white font-semibold">
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
                  {categories.map((category) => (
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
    </div>
  );
}
