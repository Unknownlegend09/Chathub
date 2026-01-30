import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUsers } from "@/hooks/use-chat";
import { ChatView } from "@/components/chat-view";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ChatPage() {
  const { user } = useAuth();
  const { data: users = [], isLoading } = useUsers();
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter(u => 
    u.id !== user?.id && 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUser = users.find(u => u.id === selectedUserId);

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Sidebar List - Hidden on mobile when chat is active */}
      <div className={`w-full md:w-80 border-r border-border/50 bg-card/30 flex flex-col ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search users..." 
              className="pl-9 bg-background/50 border-border/50 focus:border-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">
              No users found
            </div>
          ) : (
            filteredUsers.map(u => (
              <button
                key={u.id}
                onClick={() => setSelectedUserId(u.id)}
                className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all ${
                  selectedUserId === u.id 
                    ? "bg-primary/10 border border-primary/20" 
                    : "hover:bg-muted/50 border border-transparent"
                }`}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarFallback className="bg-muted font-medium text-foreground">
                      {u.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {u.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-background rounded-full"></span>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm text-foreground">{u.username}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    Tap to start encrypted chat
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 ${!selectedUserId ? 'hidden md:block' : 'block'}`}>
        {selectedUserId ? (
          <div className="h-full relative">
            {/* Back button for mobile */}
            <div className="md:hidden absolute top-4 left-4 z-50">
              <Button variant="ghost" size="sm" onClick={() => setSelectedUserId(undefined)}>
                ← Back
              </Button>
            </div>
            <ChatView 
              recipientId={selectedUserId} 
              title={selectedUser?.username || "Chat"} 
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
