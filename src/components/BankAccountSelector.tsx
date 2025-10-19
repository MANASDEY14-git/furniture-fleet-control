import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { formatCurrency } from '@/utils/currencyUtils';
import { Building2 } from 'lucide-react';

interface BankAccountSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  storeId?: string;
  disabled?: boolean;
}

export default function BankAccountSelector({ 
  value, 
  onValueChange, 
  storeId,
  disabled = false 
}: BankAccountSelectorProps) {
  const { data: bankAccounts = [], isLoading } = useBankAccounts(storeId);

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
          <SelectValue placeholder="Loading accounts..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-cyan-400" />
          <SelectValue placeholder="Select bank account" />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-slate-900 border-cyan-500/30">
        {bankAccounts.map((account) => (
          <SelectItem 
            key={account.id} 
            value={account.id}
            className="text-blue-100 focus:bg-cyan-900/20 focus:text-cyan-300"
          >
            <div className="flex flex-col">
              <span className="font-medium">{account.account_name}</span>
              <span className="text-xs text-blue-300">
                {account.bank_name} - {account.account_number.slice(-4)} 
                <span className="text-cyan-400 ml-2">
                  {formatCurrency(account.current_balance)}
                </span>
              </span>
            </div>
          </SelectItem>
        ))}
        {bankAccounts.length === 0 && (
          <div className="px-2 py-4 text-sm text-blue-300 text-center">
            No bank accounts found. Add one from Settings.
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
