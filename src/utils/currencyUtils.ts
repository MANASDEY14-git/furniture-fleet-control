
export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '₹0';
  }
  return `₹${value.toLocaleString('en-IN')}`;
};

export const formatCurrencyShort = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '₹0';
  }
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(1)}Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  } else if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }
  return `₹${value.toLocaleString('en-IN')}`;
};
