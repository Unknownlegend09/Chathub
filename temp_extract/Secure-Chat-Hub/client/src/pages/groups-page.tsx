import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGroups, useCreateGroup, useUsers } from "@/hooks/use-chat";
import { ChatView } from "@/components/chat-view";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Users, Search } from "lucide-react";

export default function GroupsPage() {
  const { user } = useAuth();
  const { data: groups = [], isLoading } = useGroups();
  const { data: users = [] } = useUsers();
  const createGroup = useCreateGroup();
  
  const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || selectedMembers.length === 0) return;
    
    // Include self in group
    const memberIds = [...selectedMembers, user!.id];
    
    createGroup.mutate({ name: newGroupName, memberIds }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setNewGroupName("");
        setSelectedMembers([]);
      }
    });
  };

  const toggleMember = (id: number) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter(m => m !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="flex h-full">
      <div className={`w-full md:w-80 border-r border-border/50 bg-card/30 flex flex-col ${selectedGroupId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border/50 flex justify-between items-center">
          <h2 className="font-semibold text-lg">Your Groups</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="outline" className="h-8 w-8">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input 
                    value={newGroupName} 
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Project Team" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Select Members</Label>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                    {users.filter(u => u.id !== user?.id).map(u => (
                      <div key={u.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-lg">
                        <Checkbox 
                          id={`user-${u.id}`} 
                          checked={selectedMembers.includes(u.id)}
                          onCheckedChange={() => toggleMember(u.id)}
                        />
                        <Label htmlFor={`user-${u.id}`} className="flex-1 cursor-pointer font-normal">
                          {u.username}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || selectedMembers.length === 0 || createGroup.isPending}
                >
                  {createGroup.isPending ? "Creating..." : "Create Group"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {groups.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">
              No groups yet. Create one!
            </div>
          ) : (
            groups.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all ${
                  selectedGroupId === g.id 
                    ? "bg-primary/10 border border-primary/20" 
                    : "hover:bg-muted/50 border border-transparent"
                }`}
              >
                <div className="w-10 h-10 bg-secondary/50 rounded-lg flex items-center justify-center text-primary">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm text-foreground">{g.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {g.members?.length || 0} members
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`flex-1 ${!selectedGroupId ? 'hidden md:block' : 'block'}`}>
        {selectedGroupId ? (
          <div className="h-full relative">
            <div className="md:hidden absolute top-4 left-4 z-50">
              <Button variant="ghost" size="sm" onClick={() => setSelectedGroupId(undefined)}>
                ← Back
              </Button>
            </div>
            <ChatView 
              groupId={selectedGroupId} 
              title={selectedGroup?.name || "Group Chat"} 
            />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-muted/5">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 opacity-50" />
            </div>
            <h3 className="text-xl font-display font-bold text-foreground mb-2">Select a Group</h3>
            <p className="max-w-xs mx-auto">
              Collaborate securely with your team. Messages are end-to-end encrypted for all members.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
