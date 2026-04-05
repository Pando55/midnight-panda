import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Send, MessageCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

export default function Community() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('community-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchMessages() {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200);
    if (data) setMessages(data);
    if (error) console.error('Failed to load messages:', error);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    const { error } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      username: user.name || user.email.split('@')[0],
      message: newMessage.trim(),
    });

    if (error) {
      toast.error('Failed to send message');
      console.error(error);
    } else {
      setNewMessage('');
    }
    setSending(false);
  }

  async function deleteMessage(id: string) {
    const { error } = await supabase.from('chat_messages').delete().eq('id', id);
    if (error) toast.error('Could not delete message');
  }

  const getAvatarColor = (name: string) => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-background">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground font-display">Traders Chat</h1>
        </div>
        <p className="text-xs text-muted-foreground">{messages.length} messages • Live discussion</p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-12">No messages yet. Be the first to say something! 🐼</p>
          )}
          {messages.map((msg) => {
            const isOwn = msg.user_id === user?.id;
            return (
              <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full ${getAvatarColor(msg.username)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                  {msg.username.charAt(0).toUpperCase()}
                </div>
                <div className={`max-w-[75%] ${isOwn ? 'items-end' : ''}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-medium ${isOwn ? 'text-primary' : 'text-muted-foreground'}`}>
                      {isOwn ? 'You' : msg.username}
                    </span>
                    <span className="text-[9px] text-muted-foreground/60">
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                    {isOwn && (
                      <button onClick={() => deleteMessage(msg.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className={`rounded-2xl px-3 py-2 text-sm ${isOwn ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-secondary text-foreground rounded-tl-sm'}`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={sendMessage} className="px-4 py-3 border-t border-border flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-secondary border-border"
          maxLength={500}
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim() || sending} className="shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
