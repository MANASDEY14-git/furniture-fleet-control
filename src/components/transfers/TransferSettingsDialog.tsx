import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStoreContext } from '@/contexts/StoreContext';
import { useSaveTransferSettings, useTransferSettings } from '@/hooks/useStockTransfers';

export function TransferSettingsDialog() {
  const { accessibleStores, activeStoreId } = useStoreContext();
  const { data: settings = [] } = useTransferSettings();
  const save = useSaveTransferSettings();
  const [open, setOpen] = useState(false);
  const [storeId, setStoreId] = useState(activeStoreId === 'all' ? '' : activeStoreId);
  const [code, setCode] = useState('');
  const [prefix, setPrefix] = useState('ST');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [contact, setContact] = useState('');

  useEffect(() => {
    const current = settings.find((entry) => entry.store_id === storeId);
    setCode(current?.godown_code || '');
    setPrefix(current?.challan_prefix || 'ST');
    setAddress(current?.address || '');
    setPhone(current?.phone || '');
    setContact(current?.contact_person || '');
  }, [storeId, settings]);

  const submit = async () => {
    if (!storeId || !code.trim() || !prefix.trim()) return;
    await save.mutateAsync({ store_id: storeId, godown_code: code.trim().toUpperCase(), challan_prefix: prefix.trim().toUpperCase(), address: address || null, phone: phone || null, contact_person: contact || null });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Settings /> Challan settings</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Godown challan settings</DialogTitle><DialogDescription>The code and prefix form the permanent serial number assigned at dispatch.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Godown</Label><Select value={storeId} onValueChange={setStoreId}><SelectTrigger><SelectValue placeholder="Select godown" /></SelectTrigger><SelectContent>{accessibleStores.map((store) => <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Godown code</Label><Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="GHY" /></div><div className="space-y-2"><Label>Challan prefix</Label><Input value={prefix} onChange={(event) => setPrefix(event.target.value)} placeholder="ST" /></div></div>
          <div className="space-y-2"><Label>Address</Label><Input value={address} onChange={(event) => setAddress(event.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Contact person</Label><Input value={contact} onChange={(event) => setContact(event.target.value)} /></div><div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(event) => setPhone(event.target.value)} /></div></div>
          {storeId && <p className="rounded-md bg-muted px-3 py-2 text-sm">Example: <strong>{code || 'CODE'}/{prefix || 'ST'}/2026-27/000001</strong></p>}
        </div>
        <DialogFooter><Button onClick={submit} disabled={!storeId || !code.trim() || !prefix.trim() || save.isPending}>Save settings</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}