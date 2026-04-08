import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GoyaNav from "@/components/GoyaNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Conversation {
  recipientId: string;
  recipientName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

const Messages = () => {
  const { recipientId } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authUser) setCurrentUser(authUser.id);
  }, [authUser]);

  // Fetch recipient name when recipientId is set
  useEffect(() => {
    if (recipientId) {
      supabase.from("profiles").select("full_name").eq("user_id", recipientId).single()
        .then(({ data }) => setRecipientName(data?.full_name || "User"));
    }
  }, [recipientId]);

  // Fetch conversations list when no recipient selected
  useEffect(() => {
    if (!currentUser || recipientId) return;
    fetchConversations();
  }, [currentUser, recipientId]);

  const fetchConversations = async () => {
    if (!currentUser) return;
    setLoadingConversations(true);

    // Get all messages involving the current user
    const { data: allMessages } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${currentUser},receiver_id.eq.${currentUser}`)
      .order("created_at", { ascending: false });

    if (!allMessages || allMessages.length === 0) {
      setConversations([]);
      setLoadingConversations(false);
      return;
    }

    // Group by conversation partner
    const convMap = new Map<string, { lastMsg: any; unread: number }>();
    for (const msg of allMessages) {
      const partnerId = msg.sender_id === currentUser ? msg.receiver_id : msg.sender_id;
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, { lastMsg: msg, unread: 0 });
      }
      if (msg.receiver_id === currentUser && !msg.read) {
        const entry = convMap.get(partnerId)!;
        entry.unread++;
      }
    }

    // Get partner names
    const partnerIds = [...convMap.keys()];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", partnerIds);

    const nameMap: Record<string, string> = {};
    profiles?.forEach((p: any) => { nameMap[p.user_id] = p.full_name || "User"; });

    const convList: Conversation[] = partnerIds.map((id) => {
      const entry = convMap.get(id)!;
      return {
        recipientId: id,
        recipientName: nameMap[id] || "User",
        lastMessage: entry.lastMsg.content || "📷 Image",
        lastMessageAt: entry.lastMsg.created_at,
        unreadCount: entry.unread,
      };
    });

    // Sort by most recent
    convList.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    setConversations(convList);
    setLoadingConversations(false);
  };

  // Fetch messages for a specific conversation
  useEffect(() => {
    if (!currentUser || !recipientId) return;
    fetchMessages();

    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as any;
        if ((msg.sender_id === currentUser && msg.receiver_id === recipientId) ||
            (msg.sender_id === recipientId && msg.receiver_id === currentUser)) {
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();

    // Mark messages as read
    supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_id", currentUser)
      .eq("sender_id", recipientId)
      .eq("read", false)
      .then(() => {});

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, recipientId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${currentUser},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${currentUser})`)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !recipientId) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: currentUser,
      receiver_id: recipientId,
      content: newMessage.trim(),
    });
    if (error) toast.error("Failed to send");
    else setNewMessage("");
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Conversation list view
  if (!recipientId) {
    return (
      <div className="min-h-screen bg-craft-grey flex flex-col">
        <GoyaNav />
        <main className="flex-1 flex flex-col pt-16 sm:pt-20 max-w-2xl mx-auto w-full px-3 sm:px-4">
          <div className="bg-surface border border-border rounded-lg mt-3 sm:mt-4 overflow-hidden">
            <div className="p-4 border-b border-border">
              <h1 className="font-bold text-lg">Messages</h1>
            </div>
            {loadingConversations ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No conversations yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((conv) => (
                  <button
                    key={conv.recipientId}
                    onClick={() => navigate(`/messages/${conv.recipientId}`)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 goya-transition text-left"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary">person</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm truncate">{conv.recipientName}</span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatTime(conv.lastMessageAt)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Chat view
  return (
    <div className="min-h-screen bg-craft-grey flex flex-col">
      <GoyaNav />
      <main className="flex-1 flex flex-col pt-16 sm:pt-20 max-w-2xl mx-auto w-full px-3 sm:px-4">
        <div className="bg-surface border border-border rounded-t-lg p-3 sm:p-4 mt-3 sm:mt-4 flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/messages")} className="p-1">
            <span className="material-symbols-outlined">arrow_back</span>
          </Button>
          <h1 className="font-bold text-lg">{recipientName}</h1>
        </div>

        <div className="flex-1 bg-surface border-x border-border overflow-y-auto p-3 sm:p-4 space-y-3 max-h-[55vh] sm:max-h-[60vh]">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_id === currentUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                msg.sender_id === currentUser
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-secondary text-secondary-foreground rounded-bl-sm"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="bg-surface border border-border rounded-b-lg p-4 flex gap-2 mb-4">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1"
          />
          <Button onClick={sendMessage} className="bg-primary text-primary-foreground hover:bg-lavender-glow">
            <span className="material-symbols-outlined">send</span>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Messages;
