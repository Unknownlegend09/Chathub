import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { LayoutShell } from "@/components/layout-shell";
import { useAuth } from "@/hooks/use-auth";

import AuthPage from "@/pages/auth-page";
import ChatPage from "@/pages/chat-page";
import GroupsPage from "@/pages/groups-page";
import ProfilePage from "@/pages/profile-page";
import AdminPage from "@/pages/admin-page";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      <Route path="/">
        <LayoutShell>
          <ProtectedRoute component={ChatPage} />
        </LayoutShell>
      </Route>
      
      <Route path="/groups">
        <LayoutShell>
          <ProtectedRoute component={GroupsPage} />
        </LayoutShell>
      </Route>

      <Route path="/profile">
        <LayoutShell>
          <ProtectedRoute component={ProfilePage} />
        </LayoutShell>
      </Route>

      <Route path="/admin">
        <LayoutShell>
          <ProtectedRoute component={AdminPage} />
        </LayoutShell>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
