
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
        <SettingsIcon className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage stores and categories</p>
        </div>
      </div>

      {/* Stores Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Stores</CardTitle>
          <StoreForm
            trigger={
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Store
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          {storesLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading stores...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="font-medium">{store.name}</TableCell>
                      <TableCell>{store.location}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <StoreForm
                            store={store}
                            trigger={
                              <Button variant="ghost" size="sm">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            }
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Store</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{store.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteStore(store.id)}>
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
              <p className="text-gray-500">No stores found. Add your first store above.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Categories</CardTitle>
          <CategoryForm
            trigger={
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          {categoriesLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading categories...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <CategoryForm
                            category={category}
                            trigger={
                              <Button variant="ghost" size="sm">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            }
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>
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
              <p className="text-gray-500">No categories found. Add your first category above.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
