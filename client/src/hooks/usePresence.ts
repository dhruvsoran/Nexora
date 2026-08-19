import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getPresence } from '../api/chat';
import { getSocket } from '../store/socket';

export function usePresence(workspaceId: string) {
  const queryClient = useQueryClient();
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ['presence', workspaceId],
    queryFn: () => getPresence(workspaceId),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (payload: { workspaceId?: string; userId: string; online: boolean }) => {
      if (payload.workspaceId && payload.workspaceId === workspaceId) {
        setOnlineIds((prev) => {
          const next = new Set(prev);
          if (payload.online) next.add(payload.userId);
          else next.delete(payload.userId);
          return next;
        });
      }
    };
    socket.on('presence:update', handler);
    return () => {
      socket.off('presence:update', handler);
    };
  }, [workspaceId]);

  useEffect(() => {
    if (query.data) setOnlineIds(new Set(query.data));
  }, [query.data]);

  const updatePresence = () => {
    queryClient.invalidateQueries({ queryKey: ['presence', workspaceId] });
  };

  return { onlineIds, updatePresence };
}