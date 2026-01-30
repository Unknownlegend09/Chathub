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
    refetchInterval: 3000, // Poll every 3s for new messages
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
    onSuccess: (data) => {
      // Invalidate messages query to show new message immediately
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
    },
  });
}
