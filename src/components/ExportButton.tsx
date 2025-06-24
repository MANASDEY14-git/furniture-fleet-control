
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Database } from 'lucide-react';
import { exportToCSV, exportToJSON, formatDataForExport } from '@/utils/exportUtils';

interface ExportButtonProps {
  data: any[];
  filename: string;
  type: 'sales' | 'purchases' | 'items' | 'payments';
}

export default function ExportButton({ data, filename, type }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const formattedData = formatDataForExport(data, type);
      
      if (format === 'csv') {
        exportToCSV(formattedData, filename);
      } else {
        exportToJSON(formattedData, filename);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="cyber-button text-white"
          disabled={isExporting || data.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="futuristic-card">
        <DropdownMenuItem 
          onClick={() => handleExport('csv')}
          className="text-blue-100 hover:bg-blue-800/30"
        >
          <FileText className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('json')}
          className="text-blue-100 hover:bg-blue-800/30"
        >
          <Database className="w-4 h-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
