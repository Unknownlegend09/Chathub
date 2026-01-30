import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMessages, useSendMessage } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Lock, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

interface ChatViewProps {
  recipientId?: number;
  groupId?: number;
  title: string;
}

export function ChatView({ recipientId, groupId, title }: ChatViewProps) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useMessages(recipientId, groupId);
  const sendMessage = useSendMessage();
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user) return;

    sendMessage.mutate({
      content: inputValue,
      senderId: user.id,
      receiverId: recipientId || null,
      groupId: groupId || null,
    });
    setInputValue("");
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-primary/20">
            <AvatarFallback className="bg-muted text-foreground">
              {title.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{title}</h2>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-primary" />
              <span className="text-xs text-muted-foreground">End-to-end encrypted</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 md:p-6">
        <div className="space-y-4 max-w-3xl mx-auto flex flex-col justify-end min-h-full pb-4">
          <div className="text-center py-8 opacity-50">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <p className="text-sm text-muted-foreground">
              Messages are secured with end-to-end encryption. Only you and the recipient can read them.
            </p>
          </div>

          {messages.map((msg, idx) => {
            const isMe = msg.senderId === user.id;
            const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <div className="w-8 flex-shrink-0">
                    {showAvatar && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs bg-muted">
                          U{msg.senderId}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[80%] md:max-w-[60%] rounded-2xl px-4 py-3 shadow-sm ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={`text-[10px] mt-1 text-right opacity-70 ${isMe ? "text-primary-foreground" : "text-muted-foreground"}`}>
                    {msg.createdAt && format(new Date(msg.createdAt), "h:mm a")}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 bg-background border-t border-border/50">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex gap-3">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type an encrypted message..."
            className="rounded-full bg-muted/50 border-transparent focus:border-primary focus:bg-background h-12 px-6 pr-12 transition-all shadow-sm"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!inputValue.trim() || sendMessage.isPending}
            className="rounded-full h-12 w-12 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
