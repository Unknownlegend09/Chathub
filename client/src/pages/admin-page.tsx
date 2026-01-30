import { useAuth } from "@/hooks/use-auth";
import { useAdminUsersActivity, useDeleteUser, usePromoteToAdmin, useUsers } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Shield, Trash2, UserPlus, Activity, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminPage() {
  const { user } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: activity } = useAdminUsersActivity();
  const deleteUser = useDeleteUser();
  const promoteToAdmin = usePromoteToAdmin();

  if (!user?.isAdmin) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="w-5 h-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access this page. Only admins can view user management.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const onlineCount = activity?.filter((a: any) => a.isOnline).length ?? 0;
  const totalUsers = users.length;

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">Manage users, monitor activity, and control access.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-users">{totalUsers}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Activity className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500" data-testid="text-online-users">{onlineCount}</p>
              <p className="text-sm text-muted-foreground">Online Now</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <Clock className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalUsers - onlineCount}</p>
              <p className="text-sm text-muted-foreground">Offline</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>View all users, their activity status, and manage their accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((u: any) => {
              const userActivity = activity?.find((a: any) => a.id === u.id);
              const isOnline = userActivity?.isOnline ?? u.isOnline ?? false;
              const lastSeen = userActivity?.lastSeen ?? u.lastSeen;
              const isTyping = userActivity?.isTyping ?? false;
              const isCurrentUser = u.id === user.id;

              return (
                <div 
                  key={u.id} 
                  className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  data-testid={`admin-user-row-${u.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12 border border-border">
                        <AvatarFallback className="bg-muted font-medium text-foreground">
                          {u.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {u.username}
                        {u.isAdmin && (
                          <Badge variant="secondary" className="text-xs">Admin</Badge>
                        )}
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {isTyping ? (
                          <span className="text-primary">Currently typing...</span>
                        ) : isOnline ? (
                          <span className="text-green-500">Online</span>
                        ) : lastSeen ? (
                          `Last seen ${format(new Date(lastSeen), "MMM d, h:mm a")}`
                        ) : (
                          "Never logged in"
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!u.isAdmin && !isCurrentUser && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => promoteToAdmin.mutate(u.id)}
                        disabled={promoteToAdmin.isPending}
                        data-testid={`button-promote-${u.id}`}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Make Admin
                      </Button>
                    )}
                    {!isCurrentUser && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deleteUser.isPending}
                            data-testid={`button-delete-${u.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {u.username}? This action cannot be undone.
                              All their messages and data will be removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUser.mutate(u.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
