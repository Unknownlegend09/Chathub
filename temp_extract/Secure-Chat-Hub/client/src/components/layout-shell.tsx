import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  LogOut, 
  MessageSquare, 
  ShieldCheck, 
  Users, 
  Settings, 
  Menu 
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function LayoutShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const NavContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border/50">
      <div className="p-6 border-b border-border/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <span className="font-display font-bold text-xl tracking-tight">CipherChat</span>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <Link href="/" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location === '/' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
          <MessageSquare className="w-5 h-5" />
          Chat
        </Link>
        <Link href="/groups" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location === '/groups' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
          <Users className="w-5 h-5" />
          Groups
        </Link>
        <Link href="/profile" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location === '/profile' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
          <Settings className="w-5 h-5" />
          Security
        </Link>
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 mb-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {user.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">{user.username}</span>
              <span className="text-xs text-primary mt-1">Online</span>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => logout.mutate()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 h-full shrink-0 z-20">
        <NavContent />
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-lg border-b border-border z-50 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2 text-primary font-display font-bold text-lg">
          <ShieldCheck className="w-5 h-5" />
          CipherChat
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r border-border">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative md:static pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
