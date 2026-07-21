import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AssistantChat } from './AssistantChat';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function AssistantBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [storeId, setStoreId] = useState<string>();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const fetchStore = async () => {
      const { data } = await supabase
        .from('user_store_access')
        .select('store_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (data) setStoreId(data.store_id);
    };
    fetchStore();
  }, [user?.id]);

  return (
    <>
      {isOpen && <AssistantChat storeId={storeId} onClose={() => setIsOpen(false)} />}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 sm:right-6 z-50 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all"
        size="icon"
      >
        <MessageCircle className="w-5 h-5" />
      </Button>
    </>
  );
}
