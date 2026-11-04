import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { notifyAchievements, invalidateAchievements } from './notifyAchievements';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('notifyAchievements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('notifies on newly unlocked achievements and invalidates cache', async () => {
    const mockRpc = vi.mocked(supabase.rpc);
    mockRpc.mockResolvedValueOnce({
      data: ['first_session', 'closer'],
      error: null,
    } as never);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const result = await notifyAchievements(queryClient);

    expect(result).toEqual(['first_session', 'closer']);
    expect(toast.success).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenCalledWith('Achievement unlocked: First steps', {
      description: 'Finish your first focus session.',
    });
    expect(toast.success).toHaveBeenCalledWith('Achievement unlocked: Closer', {
      description: 'Complete 25 todos.',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['achievements'] });
  });

  it('filters out unknown achievement ids', async () => {
    const mockRpc = vi.mocked(supabase.rpc);
    mockRpc.mockResolvedValueOnce({
      data: ['first_session', 'unknown_achievement_xyz'],
      error: null,
    } as never);

    const result = await notifyAchievements();
    expect(result).toEqual(['first_session']);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it('swallows errors and does not throw', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockRpc = vi.mocked(supabase.rpc);
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection error' },
    } as never);

    const result = await notifyAchievements();
    expect(result).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('swallows thrown exceptions and does not throw', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockRpc = vi.mocked(supabase.rpc);
    mockRpc.mockRejectedValueOnce(new Error('Network failure'));

    const result = await notifyAchievements();
    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('invalidateAchievements calls queryClient.invalidateQueries', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    await invalidateAchievements(queryClient);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['achievements'] });
  });
});
