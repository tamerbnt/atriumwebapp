import { getSupabaseClient } from '../client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeSubscriptionCallbacks {
  onMemberChange?: (payload: any) => void;
  onLeadChange?: (payload: any) => void;
  onBranchChange?: (payload: any) => void;
  onRentalBookingChange?: (payload: any) => void;
  onRentableUnitChange?: (payload: any) => void;
}

let activeChannel: RealtimeChannel | null = null;

export const realtimeService = {
  subscribeToBranch(
    branchId: string,
    callbacks: RealtimeSubscriptionCallbacks
  ): (() => void) {
    const client = getSupabaseClient();
    if (!client) {
      return () => {};
    }

    try {
      // Remove any previously active channel to avoid channel reuse collision
      if (activeChannel) {
        try {
          client.removeChannel(activeChannel);
        } catch (e) {
          console.warn('[Realtime] Previous channel remove failed:', e);
        }
        activeChannel = null;
      }

      // Generate a unique channel topic to prevent "cannot add callbacks after subscribe()"
      const channelName = `branch-sync-${branchId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rental_bookings',
            filter: `branch_id=eq.${branchId}`,
          },
          (payload) => {
            if (callbacks.onRentalBookingChange) callbacks.onRentalBookingChange(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rentable_units',
            filter: `branch_id=eq.${branchId}`,
          },
          (payload) => {
            if (callbacks.onRentableUnitChange) callbacks.onRentableUnitChange(payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Connected to realtime channel
          }
        });

      activeChannel = channel;

      return () => {
        try {
          if (activeChannel === channel) {
            activeChannel = null;
          }
          client.removeChannel(channel);
        } catch (e) {
          console.warn('[Realtime] Cleanup channel failed:', e);
        }
      };
    } catch (err) {
      console.warn('[Realtime] Failed to establish branch subscription:', err);
      return () => {};
    }
  },
};

