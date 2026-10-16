import { getSupabaseClient } from '../client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeSubscriptionCallbacks {
  onMemberChange?: (payload: any) => void;
  onLeadChange?: (payload: any) => void;
  onBranchChange?: (payload: any) => void;
}

export const realtimeService = {
  subscribeToBranch(
    branchId: string,
    callbacks: RealtimeSubscriptionCallbacks
  ): (() => void) {
    const client = getSupabaseClient();
    if (!client) {
      return () => {};
    }

    const channelName = `branch-sync-${branchId}`;
    const channel: RealtimeChannel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members_directory',
          filter: `branch_id=eq.${branchId}`,
        },
        (payload) => {
          if (callbacks.onMemberChange) callbacks.onMemberChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registration_requests',
          filter: `branch_id=eq.${branchId}`,
        },
        (payload) => {
          if (callbacks.onLeadChange) callbacks.onLeadChange(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Connected to realtime channel
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  },
};
