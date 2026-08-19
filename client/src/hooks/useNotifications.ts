import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../store/socket';
import { getNotifications } from '../api/notifications';
import { useEffect } from 'react';

export function useNotifications() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };
    socket.on('notification:new', handler);
    return () => {
      socket.off('notification:new', handler);
    };
  }, [queryClient]);

  return query;
}