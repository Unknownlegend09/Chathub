import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUsers } from "@/hooks/use-chat";
import { useWebSocket } from "@/hooks/use-websocket";
import { ChatView } from "@/components/chat-view";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Bell, BellOff } from "lucide-react";

export default function ChatPage() {
  const { user } = useAuth();
  const { data: users = [], isLoading } = useUsers();
  const { onlineUsers, typingUsers } = useWebSocket();
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === "granted");
    }
  };

  const filteredUsers = users.filter(u => 
    u.id !== user?.id && 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUser = users.find(u => u.id === selectedUserId);
  const selectedUserOnline = selectedUserId ? (onlineUsers.get(selectedUserId) ?? selectedUser?.isOnline ?? false) : false;
  const selectedUserTyping = selectedUserId ? typingUsers.get(selectedUserId) : false;

  if (isLoading) return (
    <div className="flex items-center justify-center h-full" data-testid="loading-spinner">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="flex h-full">
      <div className={`w-full md:w-80 border-r border-border/50 bg-card/30 flex flex-col ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Chats</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={requestNotificationPermission}
              className={notificationsEnabled ? "text-primary" : "text-muted-foreground"}
              data-testid="button-notifications"
              title={notificationsEnabled ? "Notifications enabled" : "Enable notifications"}
            >
              {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search users..." 
              className="pl-9 bg-background/50 border-border/50 focus:border-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-users"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">
              No users found
            </div>
          ) : (
            filteredUsers.map(u => {
              const userOnline = onlineUsers.get(u.id) ?? u.isOnline ?? false;
              const userTyping = typingUsers.get(u.id) ?? false;
              
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all ${
                    selectedUserId === u.id 
                      ? "bg-primary/10 border border-primary/20" 
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                  data-testid={`user-item-${u.id}`}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarFallback className="bg-muted font-medium text-foreground">
                        {u.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {userOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm text-foreground flex items-center gap-2">
                      {u.username}
                      {u.isAdmin && (
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">Admin</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {userTyping ? (
                        <span className="text-primary">typing...</span>
                      ) : userOnline ? (
                        <span className="text-green-500">Online</span>
                      ) : u.lastSeen ? (
                        `Last seen ${formatLastSeen(u.lastSeen)}`
                      ) : (
                        "Tap to start encrypted chat"
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className={`flex-1 ${!selectedUserId ? 'hidden md:block' : 'block'}`}>
        {selectedUserId ? (
          <div className="h-full relative">
            <div className="md:hidden absolute top-4 left-4 z-50">
              <Button variant="ghost" size="sm" onClick={() => setSelectedUserId(undefined)} data-testid="button-back">
                ← Back
              </Button>
            </div>
            <ChatView 
              recipientId={selectedUserId} 
              title={selectedUser?.username || "Chat"} 
              isOnline={selectedUserOnline}
              isTyping={selectedUserTyping}
              lastSeen={selectedUser?.lastSeen ? String(selectedUser.lastSeen) : null}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-muted/5">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 opacity-50" />
            </div>
            <h3 className="text-xl font-display font-bold text-foreground mb-2">Select a Conversation</h3>
            <p className="max-w-xs mx-auto">
              Choose a user from the sidebar to start a secure, end-to-end encrypted chat.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatLastSeen(lastSeen: string | Date): string {
  try {
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "recently";
  }
}
