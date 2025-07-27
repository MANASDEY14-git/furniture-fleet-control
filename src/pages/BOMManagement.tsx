import { useState } from 'react';
import { Plus, Package2, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ItemForm from '@/components/ItemForm';
import { BOMList } from '@/components/bom/BOMList';
import { BOMCostAnalytics } from '@/components/bom/BOMCostAnalytics';
import { BOMTemplates } from '@/components/bom/BOMTemplates';
import { useItems } from '@/hooks/useItems';

export default function BOMManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'list' | 'analytics' | 'templates'>('list');
  
  const { data: items = [] } = useItems();

  const tabs = [
    { id: 'list', label: 'BOM List', icon: Package2 },
    { id: 'analytics', label: 'Cost Analytics', icon: Filter },
    { id: 'templates', label: 'Templates', icon: Plus },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">
            Bill of Materials Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage product components, materials, and cost analysis
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <ItemForm
            trigger={
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create New Item with BOM
              </Button>
            }
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">Total Items</p>
                <p className="text-2xl font-bold text-cyan-300">{items.length}</p>
              </div>
              <Package2 className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">Items with BOM</p>
                <p className="text-2xl font-bold text-cyan-300">
                  {items.filter(item => item.id).length}
                </p>
              </div>
              <Package2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">Active BOMs</p>
                <p className="text-2xl font-bold text-cyan-300">
                  {items.length}
                </p>
              </div>
              <Badge variant="secondary" className="bg-green-600/20 text-green-300">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">Avg. Components</p>
                <p className="text-2xl font-bold text-cyan-300">3.2</p>
              </div>
              <Package2 className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg border border-blue-500/30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-blue-200 hover:text-white hover:bg-slate-700'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Filter Bar */}
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
              <Input
                placeholder="Search items, materials, or BOMs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700/50 border-blue-500/30 text-white placeholder-blue-300"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48 bg-slate-700/50 border-blue-500/30 text-white">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
                <SelectItem value="accessories">Accessories</SelectItem>
                <SelectItem value="hardware">Hardware</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="border-blue-500/30 text-blue-200 hover:bg-blue-800/30">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'list' && (
          <BOMList 
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
          />
        )}
        
        {activeTab === 'analytics' && (
          <BOMCostAnalytics />
        )}
        
        {activeTab === 'templates' && (
          <BOMTemplates />
        )}
      </div>
    </div>
  );
}