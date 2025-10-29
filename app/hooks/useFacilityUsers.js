import { useState, useEffect } from 'react';
import { createClientSupabase } from '@/lib/client-supabase';

export function useFacilityUsers(facilityId, currentUser) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [error, setError] = useState(null);

  const supabase = createClientSupabase();

  useEffect(() => {
    if (facilityId && currentUser) {
      fetchUsers();
      getCurrentUserRole();
    }
  }, [facilityId, currentUser]);

  async function getCurrentUserRole() {
    try {
      const { data, error } = await supabase
        .from('facility_users')
        .select('role')
        .eq('facility_id', facilityId)
        .eq('user_id', currentUser.id)
        .eq('status', 'active')
        .single();

      if (error) {
        // Handle specific error codes
        if (error.code === 'PGRST116') {
          // No rows returned - check profiles table for backward compatibility
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();

          if (profileData?.role) {
            setCurrentUserRole(profileData.role);
          } else {
            console.warn('User role not found, defaulting to scheduler');
            setCurrentUserRole('scheduler');
          }
          return;
        }
        throw error;
      }
      setCurrentUserRole(data.role);
    } catch (error) {
      console.error('Error getting current user role:', error);
      setCurrentUserRole('scheduler');
      setError(`Role fetch failed: ${error.message}`);
    }
  }

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('facility_users')
        .select(`
          id,
          user_id,
          role,
          status,
          invited_at,
          invited_by,
          is_owner
        `)
        .eq('facility_id', facilityId)
        .order('invited_at', { ascending: false });

      if (error) throw error;

      // Get profile info separately for now
      const userIds = data.map(user => user.user_id);
      let profiles = [];
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        profiles = profilesData || [];
      }

      // Transform data to include profile info at the top level
      // Filter based on current user's role:
      // - Super Admin/Facility: sees admins and schedulers (not other super admins)
      // - Admin: sees themselves and schedulers
      // - Scheduler: sees no one (they can't manage users)
      const transformedUsers = data
        .filter(user => {
          // Always filter out facility owner role
          if (user.role === 'facility') return false;

          // Filter based on current user's role
          if (currentUserRole === 'facility' || currentUserRole === 'super_admin') {
            // Super Admin sees everyone except other super admins and facility owner
            return user.role !== 'facility' && user.role !== 'super_admin';
          } else if (currentUserRole === 'admin') {
            // Admin sees themselves and schedulers
            return user.user_id === currentUser?.id || user.role === 'scheduler';
          } else {
            // Scheduler sees no one
            return false;
          }
        })
        .map(user => {
          const profile = profiles.find(p => p.id === user.user_id);
          return {
            ...user,
            firstName: profile?.first_name || 'Unknown',
            lastName: profile?.last_name || 'User',
            email: profile?.email || `user-${user.user_id.slice(0, 8)}@example.com`,
            is_owner: Boolean(user.is_owner) // Ensure it's always a boolean
          };
        });

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function addUser(userData) {
    try {
      setError(null);
      
      console.log('🚀 Calling API with facilityId:', facilityId);
      console.log('📝 User data:', userData);
      
      const requestBody = {
        facilityId,
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: userData.role
      };
      
      console.log('📦 Request body:', requestBody);
      
      const response = await fetch('/api/facility/simple-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      // Refresh users list
      await fetchUsers();
      
      return { success: true, message: result.message };
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }

  async function updateUserRole(userId, newRole) {
    try {
      setError(null);
      
      const response = await fetch('/api/facility/update-user-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId,
          userId,
          newRole,
          currentUserRole
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user role');
      }

      // Refresh users list
      await fetchUsers();
      
      return { success: true, message: result.message };
    } catch (error) {
      console.error('Error updating user role:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }

  async function updateUser(userId, userData) {
    try {
      setError(null);
      
      const response = await fetch('/api/facility/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId,
          userId,
          ...userData
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user');
      }

      // Refresh users list
      await fetchUsers();

      return { success: true, message: result.message };
    } catch (error) {
      console.error('Error updating user:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }

  async function removeUser(userId) {
    try {
      setError(null);
      
      console.log('🗑️ Deleting user:', userId);

      const response = await fetch('/api/facility/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId,
          userId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      console.log('✅ User deleted successfully');

      // Refresh users list
      await fetchUsers();

      return { success: true, message: result.message };
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }

  // Permission helpers
  const canInviteUsers = currentUserRole === 'facility' || currentUserRole === 'admin';
  const canManageAdmins = currentUserRole === 'facility';
  const canManageSchedulers = ['facility', 'admin'].includes(currentUserRole);

  function canUpdateUser(targetUserRole) {
    // Super Admin (facility role) can manage admins and schedulers
    if (currentUserRole === 'facility') return true;
    // Admins can only manage schedulers
    if (currentUserRole === 'admin' && targetUserRole === 'scheduler') return true;
    return false;
  }

  function canRemoveUser(targetUserId, targetUserRole) {
    if (targetUserId === currentUser.id) return false; // Can't remove yourself
    // Super Admin (facility role) can remove admins and schedulers
    if (currentUserRole === 'facility') return true;
    // Admins can only remove schedulers
    if (currentUserRole === 'admin' && targetUserRole === 'scheduler') return true;
    return false;
  }

  // Check if current user is the facility owner (with safety check)
  const isOwner = users.find(u => u.user_id === currentUser?.id)?.is_owner || false;

  return {
    users,
    loading,
    error,
    currentUserRole,
    isOwner,
    fetchUsers,
    addUser,
    updateUser,
    updateUserRole,
    removeUser,
    canInviteUsers,
    canManageAdmins,
    canManageSchedulers,
    canUpdateUser,
    canRemoveUser
  };
}