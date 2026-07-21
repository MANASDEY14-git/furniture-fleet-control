import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '@/hooks/useCustomers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, User, Phone, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { Skeleton } from '@/components/ui/skeleton';

export default function Customers() {
  const { data: customers = [], isLoading } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const navigate = useNavigate();

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (customer.phone && customer.phone.includes(searchTerm)) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold glow-text text-cyan-400">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="cyber-button text-white font-semibold">
              <Plus className="w-4 h-4 mr-2" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] border-cyan-500/30 bg-background/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-cyan-400 text-xl font-bold">Add New Customer</DialogTitle>
            </DialogHeader>
            <CustomerForm 
              onSuccess={() => setIsAddDialogOpen(false)} 
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="futuristic-card border-border/50">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/50 border-border/50 focus:border-cyan-500/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/30">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="font-semibold text-cyan-400">Customer Details</TableHead>
                  <TableHead className="font-semibold text-cyan-400">Contact</TableHead>
                  <TableHead className="font-semibold text-cyan-400 hidden md:table-cell">Address / Location</TableHead>
                  <TableHead className="font-semibold text-cyan-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No customers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow 
                      key={customer.id}
                      className="border-border/30 hover:bg-cyan-950/20 transition-colors cursor-pointer"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-base">{customer.name}</p>
                            {customer.gst_number && (
                              <p className="text-xs text-muted-foreground">GST: <span className="font-mono">{customer.gst_number}</span></p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {customer.phone && (
                            <div className="flex items-center text-sm text-foreground">
                              <Phone className="w-3 h-3 mr-2 text-cyan-500" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.email && (
                            <div className="text-xs text-muted-foreground">{customer.email}</div>
                          )}
                          {!customer.phone && !customer.email && <span className="text-muted-foreground text-sm">-</span>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px]">
                        {customer.address ? (
                          <div className="flex items-start">
                            <MapPin className="w-3 h-3 mr-2 mt-1 text-cyan-500 shrink-0" />
                            <span className="text-sm text-muted-foreground truncate" title={customer.address}>{customer.address}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${customer.id}`);
                          }}
                        >
                          View Profile
                        </Button>
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
