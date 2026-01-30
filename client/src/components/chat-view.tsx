import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMessages, useSendMessage, useMarkMessagesRead } from "@/hooks/use-chat";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Lock, MoreVertical, Check, CheckCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

interface ChatViewProps {
  recipientId?: number;
  groupId?: number;
  title: string;
  isTyping?: boolean;
  isOnline?: boolean;
  lastSeen?: string | null;
}

export function ChatView({ recipientId, groupId, title, isTyping: externalIsTyping, isOnline, lastSeen }: ChatViewProps) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useMessages(recipientId, groupId);
  const sendMessage = useSendMessage();
  const markMessagesRead = useMarkMessagesRead();
  const { sendTyping, typingUsers, markRead } = useWebSocket();
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const isRecipientTyping = recipientId ? typingUsers.get(recipientId) : false;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (recipientId && messages.length > 0) {
      const unreadMessages = messages.filter(
        m => m.senderId === recipientId && !m.isRead
      );
      if (unreadMessages.length > 0) {
        markMessagesRead.mutate(recipientId);
        unreadMessages.forEach(m => markRead(m.id));
      }
    }
  }, [recipientId, messages, markMessagesRead, markRead]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    if (recipientId) {
      sendTyping(true, recipientId);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(false, recipientId);
      }, 2000);
    }
  }, [recipientId, sendTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user) return;

    if (recipientId && typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      sendTyping(false, recipientId);
    }

    sendMessage.mutate({
      content: inputValue,
      senderId: user.id,
      receiverId: recipientId || null,
      groupId: groupId || null,
    });
    setInputValue("");
  };

  if (!user) return null;

  const getStatusText = () => {
    if (isRecipientTyping) return "typing...";
    if (isOnline) return "Online";
    if (lastSeen) {
      try {
        return `Last seen ${format(new Date(lastSeen), "MMM d, h:mm a")}`;
      } catch {
        return "Offline";
      }
    }
    return "Offline";
  };

  return (
    <div className="flex flex-col h-full bg-background relative" data-testid="chat-view">
      <div className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border border-primary/20">
              <AvatarFallback className="bg-muted text-foreground">
                {title.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></span>
            )}
          </div>
          <div>
            <h2 className="font-semibold" data-testid="text-chat-title">{title}</h2>
            <div className="flex items-center gap-1.5">
              {recipientId ? (
                <span className={`text-xs ${isRecipientTyping ? 'text-primary' : 'text-muted-foreground'}`} data-testid="text-user-status">
                  {getStatusText()}
                </span>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-primary" />
                  <span className="text-xs text-muted-foreground">End-to-end encrypted</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid="button-chat-menu">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>

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
                data-testid={`message-${msg.id}`}
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
                  <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? "text-primary-foreground" : "text-muted-foreground"}`}>
                    <span className="text-[10px] opacity-70">
                      {msg.createdAt && format(new Date(msg.createdAt), "h:mm a")}
                    </span>
                    {isMe && (
                      <span className="opacity-70" data-testid={`status-message-${msg.id}`}>
                        {msg.isRead ? (
                          <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                        ) : msg.isDelivered ? (
                          <CheckCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {isRecipientTyping && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 flex-shrink-0">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs bg-muted">
                    {title.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 bg-background border-t border-border/50">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex gap-3">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type an encrypted message..."
            className="rounded-full bg-muted/50 border-transparent focus:border-primary focus:bg-background h-12 px-6 pr-12 transition-all shadow-sm"
            data-testid="input-message"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!inputValue.trim() || sendMessage.isPending}
            className="rounded-full h-12 w-12 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            data-testid="button-send-message"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
