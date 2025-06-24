
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportToJSON = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const formatDataForExport = (data: any[], type: 'sales' | 'purchases' | 'items' | 'payments') => {
  switch (type) {
    case 'sales':
      return data.map(item => ({
        Date: new Date(item.date).toLocaleDateString(),
        'Item Name': item.item_name,
        Quantity: item.quantity,
        'Total Price': item.total_price,
        'Delivery Status': item.delivery_status,
        'Created At': new Date(item.created_at).toLocaleString()
      }));
    
    case 'purchases':
      return data.map(item => ({
        Date: new Date(item.date).toLocaleDateString(),
        'Item Name': item.item_name,
        Quantity: item.quantity,
        'Total Cost': item.total_cost,
        'Created At': new Date(item.created_at).toLocaleString()
      }));
    
    case 'items':
      return data.map(item => ({
        Name: item.name,
        'Quantity Available': item.quantity_available,
        'Cost Price': item.cost_price,
        'Selling Price': item.selling_price,
        'Created At': new Date(item.created_at).toLocaleString()
      }));
    
    case 'payments':
      return data.map(item => ({
        Date: new Date(item.date).toLocaleDateString(),
        Type: item.type,
        Amount: item.amount,
        Description: item.description || '',
        'Created At': new Date(item.created_at).toLocaleString()
      }));
    
    default:
      return data;
  }
};
