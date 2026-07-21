import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomers } from '@/hooks/useCustomers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Phone, Mail, MapPin, Building, FileText, Settings, Navigation } from 'lucide-react';
import { CustomerAddressManager } from '@/components/customers/CustomerAddressManager';
import { CustomerLedgerView } from '@/components/customers/CustomerLedgerView';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customers = [], isLoading } = useCustomers();
  const [activeTab, setActiveTab] = useState('overview');

  const customer = customers.find(c => c.id === id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-4">Customer Not Found</h2>
        <Button onClick={() => navigate('/customers')}>Return to Customers</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/customers')}
          className="text-muted-foreground hover:text-cyan-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold glow-text text-cyan-400">{customer.name}</h1>
          <p className="text-muted-foreground">Customer Profile</p>
        </div>
      </div>

      {/* Top Stats / Info Banner */}
      <Card className="futuristic-card border-border/50 bg-gradient-to-br from-background to-cyan-950/10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 md:items-center">
            <div className="w-20 h-20 rounded-full bg-cyan-950 border-2 border-cyan-800 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <User className="w-10 h-10 text-cyan-400" />
            </div>
            
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center"><Phone className="w-3 h-3 mr-1" /> Phone</p>
                <p className="font-medium">{customer.phone || 'Not Provided'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center"><Mail className="w-3 h-3 mr-1" /> Email</p>
                <p className="font-medium">{customer.email || 'Not Provided'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center"><Building className="w-3 h-3 mr-1" /> GST Number</p>
                <p className="font-medium font-mono">{customer.gst_number || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center"><Navigation className="w-3 h-3 mr-1" /> Base Address</p>
                <p className="font-medium truncate" title={customer.address || ''}>{customer.address || 'N/A'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 bg-muted/30 p-1 mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-400">
            <User className="w-4 h-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="addresses" className="data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-400">
            <MapPin className="w-4 h-4 mr-2" /> Addresses
          </TabsTrigger>
          <TabsTrigger value="ledger" className="data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-400">
            <FileText className="w-4 h-4 mr-2" /> Ledger & Finance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Notes & Details</CardTitle>
              </CardHeader>
              <CardContent>
                {customer.notes ? (
                  <p className="whitespace-pre-wrap text-foreground/80 bg-muted/20 p-4 rounded-lg">
                    {customer.notes}
                  </p>
                ) : (
                  <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                    No additional notes recorded for this customer.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start cyber-button">
                  <FileText className="w-4 h-4 mr-2" /> Create Sales Order
                </Button>
                <Button variant="outline" className="w-full justify-start border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/30">
                  <Settings className="w-4 h-4 mr-2" /> Edit Customer Info
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="addresses" className="mt-0">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Delivery Addresses</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerAddressManager customerId={customer.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-0">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Financial Ledger</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerLedgerView customerId={customer.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
