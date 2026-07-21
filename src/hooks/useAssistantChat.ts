import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const useAssistantChat = (storeId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing conversation
  useEffect(() => {
    if (!user?.id || !storeId) return;

    const loadConversation = async () => {
      const { data: conv } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('store_id', storeId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (conv) {
        setConversationId(conv.id);
        const { data: msgs } = await supabase
          .from('ai_messages')
          .select('id, role, content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });

        if (msgs) {
          setMessages(msgs as ChatMessage[]);
        }
      }
    };

    loadConversation();
  }, [user?.id, storeId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!storeId || !user?.id || isLoading) return;

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('erp-assistant', {
        body: {
          message: content,
          conversation_id: conversationId,
          store_id: storeId,
        },
      });

      if (error) throw error;

      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Assistant error:', err);
      const errorMessage = err?.message || 'Failed to get response';
      
      if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
        toast({ title: 'Rate Limited', description: 'Too many requests. Please wait a moment.', variant: 'destructive' });
      } else if (errorMessage.includes('402')) {
        toast({ title: 'Credits Exhausted', description: 'Please add AI credits in your workspace settings.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      }

      // Remove temp user message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
    } finally {
      setIsLoading(false);
    }
  }, [storeId, user?.id, conversationId, isLoading, toast]);

  const clearConversation = useCallback(async () => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return { messages, isLoading, sendMessage, clearConversation, conversationId };
};
