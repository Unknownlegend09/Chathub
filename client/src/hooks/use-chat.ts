import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertMessage } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useUsers() {
  return useQuery({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await fetch(api.users.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.users.list.responses[200].parse(await res.json());
    },
  });
}

export function useGroups() {
  return useQuery({
    queryKey: [api.groups.list.path],
    queryFn: async () => {
      const res = await fetch(api.groups.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch groups");
      return api.groups.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; memberIds: number[] }) => {
      const res = await fetch(api.groups.create.path, {
        method: api.groups.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create group");
      return api.groups.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.groups.list.path] });
      toast({ title: "Group Created", description: "Secure group channel established." });
    },
  });
}

export function useMessages(userId?: number, groupId?: number) {
  return useQuery({
    queryKey: [api.messages.list.path, { userId, groupId }],
    queryFn: async () => {
      if (!userId && !groupId) return [];
      
      const params: Record<string, string> = {};
      if (userId) params.userId = userId.toString();
      if (groupId) params.groupId = groupId.toString();
      
      const url = `${api.messages.list.path}?${new URLSearchParams(params)}`;
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return api.messages.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertMessage) => {
      const res = await fetch(api.messages.create.path, {
        method: api.messages.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to send message");
      return api.messages.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
    },
  });
}

export function useMarkMessagesRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (senderId: number) => {
      const res = await fetch(api.messages.markAllRead.path, {
        method: api.messages.markAllRead.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark messages as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
    },
  });
}

export function useAdminUsersActivity() {
  return useQuery({
    queryKey: [api.admin.getAllUsersActivity.path],
    queryFn: async () => {
      const res = await fetch(api.admin.getAllUsersActivity.path, { credentials: "include" });
      if (res.status === 403) return null;
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
    retry: false,
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.admin.getAllUsersActivity.path] });
      toast({ title: "User Deleted", description: "The user has been removed." });
    },
    onError: (error) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function usePromoteToAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}/promote`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to promote user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.admin.getAllUsersActivity.path] });
      toast({ title: "User Promoted", description: "User is now an admin." });
    },
    onError: (error) => {
      toast({ title: "Promotion Failed", description: error.message, variant: "destructive" });
    },
  });
}
