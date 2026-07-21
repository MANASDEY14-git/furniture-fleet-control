import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FeatureItem {
  name: string;
  status: 'implemented' | 'partial' | 'missing';
  description: string;
  location?: string;
}

export function BOMFeatureStatus() {
  const features: FeatureItem[] = [
    {
      name: "Multi-Component BOM Support",
      status: "implemented",
      description: "Materials, Labor, and Service components with quantity and cost tracking",
      location: "BOM Wizard > Components Step"
    },
    {
      name: "Product Customization",
      status: "implemented", 
      description: "Customizable components with alternative material options",
      location: "BOM Manager > Components Tab"
    },
    {
      name: "Version Management",
      status: "implemented",
      description: "BOM versioning with notes, change tracking, and restore capabilities",
      location: "BOM Manager > Versions Tab"
    },
    {
      name: "Cost Calculation",
      status: "implemented",
      description: "Automated cost estimation with material price tracking and cost breakdowns",
      location: "BOM Manager > Costing Tab"
    },
    {
      name: "Wizard-Based Creation",
      status: "implemented",
      description: "Step-by-step BOM creation with validation (Item → Basic Info → Components → Review)",
      location: "BOM Management > Create BOM"
    },
    {
      name: "Enhanced Management Interface",
      status: "implemented",
      description: "Tabbed interface with overview, components, costing, stock, sales, versions, production, and templates",
      location: "BOM Manager (8 tabs)"
    },
    {
      name: "Search & Filtering",
      status: "implemented",
      description: "Advanced search by name/components and category-based filtering",
      location: "BOM Management > Search Bar & Filters"
    },
    {
      name: "Bulk Operations",
      status: "implemented",
      description: "Mass operations on multiple BOMs (activate, deactivate, export)",
      location: "BOM Management > Bulk Operations Button"
    },
    {
      name: "Stock Integration",
      status: "implemented",
      description: "Real-time stock availability checking with shortage alerts and reorder suggestions",
      location: "BOM Manager > Stock Tab"
    },
    {
      name: "Sales Integration",
      status: "implemented",
      description: "BOM material deduction tracking during sales orders with impact analysis",
      location: "BOM Manager > Sales Tab"
    },
    {
      name: "Analytics Dashboard",
      status: "implemented",
      description: "Cost analysis, profitability metrics, visual charts, and material usage tracking",
      location: "BOM Management > Analytics Tab"
    }
  ];

  const getStatusIcon = (status: FeatureItem['status']) => {
    switch (status) {
      case 'implemented':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'partial':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'missing':
        return <Circle className="w-5 h-5 text-red-400" />;
    }
  };

  const getStatusBadge = (status: FeatureItem['status']) => {
    switch (status) {
      case 'implemented':
        return <Badge className="bg-green-600">Implemented</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-600">Partial</Badge>;
      case 'missing':
        return <Badge className="bg-red-600">Missing</Badge>;
    }
  };

  const implementedCount = features.filter(f => f.status === 'implemented').length;
  const partialCount = features.filter(f => f.status === 'partial').length;
  const missingCount = features.filter(f => f.status === 'missing').length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="bg-slate-800/50 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-green-300 flex items-center gap-2">
            <CheckCircle className="w-6 h-6" />
            BOM System Feature Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">{implementedCount}</div>
              <div className="text-sm text-green-200">Implemented</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-300">{partialCount}</div>
              <div className="text-sm text-yellow-200">Partial</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-300">{missingCount}</div>
              <div className="text-sm text-red-200">Missing</div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-white mb-2">
              Implementation Status: {Math.round((implementedCount / features.length) * 100)}% Complete
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div 
                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(implementedCount / features.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Details */}
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-300">Feature Implementation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(feature.status)}
                    <h4 className="font-medium text-white">{feature.name}</h4>
                  </div>
                  {getStatusBadge(feature.status)}
                </div>
                <p className="text-sm text-blue-200 mb-2">{feature.description}</p>
                {feature.location && (
                  <div className="text-xs text-cyan-300 bg-slate-600/30 px-2 py-1 rounded inline-block">
                    📍 {feature.location}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Access Guide */}
      <Card className="bg-slate-800/50 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-purple-300">Quick Access Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-white mb-2">Creating BOMs:</h4>
              <ol className="list-decimal list-inside space-y-1 text-blue-200">
                <li>Navigate to BOM Management</li>
                <li>Click "Create New BOM"</li>
                <li>Follow the 4-step wizard</li>
                <li>Review and submit</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Managing BOMs:</h4>
              <ol className="list-decimal list-inside space-y-1 text-blue-200">
                <li>Find your item in the BOM table</li>
                <li>Click "Manage" to open BOM Manager</li>
                <li>Use tabs to access different features</li>
                <li>Make changes and save</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Stock Integration:</h4>
              <ol className="list-decimal list-inside space-y-1 text-blue-200">
                <li>Open BOM Manager → Stock Tab</li>
                <li>View material availability</li>
                <li>Click "Reorder" for shortfalls</li>
                <li>Monitor stock status</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Version Control:</h4>
              <ol className="list-decimal list-inside space-y-1 text-blue-200">
                <li>Open BOM Manager → Versions Tab</li>
                <li>View version history</li>
                <li>Create new versions</li>
                <li>Restore previous versions</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}