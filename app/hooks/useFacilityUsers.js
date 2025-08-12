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

      if (error) throw error;
      setCurrentUserRole(data.role);
    } catch (error) {
      console.error('Error getting current user role:', error);
      setError(error.message);
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
      const transformedUsers = data.map(user => {
        const profile = profiles.find(p => p.id === user.user_id);
        return {
          ...user,
          firstName: profile?.first_name || 'Unknown',
          lastName: profile?.last_name || 'User',
          email: profile?.email || `user-${user.user_id.slice(0, 8)}@example.com`,
          is_owner: Boolean(user.is_owner) // Ensure it's always a boolean
        };
      });

      // Temporary: Mark the earliest super_admin as owner if no is_owner field exists
      try {
        if (transformedUsers.length > 0 && !transformedUsers.some(u => u.is_owner === true)) {
          const superAdmins = transformedUsers.filter(u => u.role === 'super_admin' && u.status === 'active');
          if (superAdmins.length > 0) {
            // Sort by invited_at or created_at to find the earliest
            superAdmins.sort((a, b) => new Date(a.invited_at || a.created_at) - new Date(b.invited_at || b.created_at));
            superAdmins[0].is_owner = true;
          }
        }
      } catch (error) {
        console.warn('Error in owner detection fallback:', error);
        // Continue without owner detection if there's an error
      }

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
      
      const response = await fetch('/api/facility/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId,
          userId,
          role: newRole,
          action: 'update_role'
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

  async function removeUser(userId) {
    try {
      setError(null);
      
      const response = await fetch('/api/facility/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId,
          userId,
          action: 'remove'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove user');
      }

      // Refresh users list
      await fetchUsers();
      
      return { success: true, message: result.message };
    } catch (error) {
      console.error('Error removing user:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }

  // Permission helpers
  const canInviteUsers = currentUserRole === 'super_admin';
  const canManageAdmins = currentUserRole === 'super_admin';
  const canManageSchedulers = ['super_admin', 'admin'].includes(currentUserRole);

  function canUpdateUser(targetUserRole) {
    if (currentUserRole === 'super_admin') return true;
    if (currentUserRole === 'admin' && targetUserRole === 'scheduler') return true;
    return false;
  }

  function canRemoveUser(targetUserId, targetUserRole) {
    if (targetUserId === currentUser.id) return false; // Can't remove yourself
    if (currentUserRole === 'super_admin') return true;
    if (currentUserRole === 'admin' && targetUserRole === 'scheduler') return true;
    return false;
  }

  // Check if current user is the facility owner (with safety check)
  const isOwner = users.find(u => u.user_id === user?.id)?.is_owner || false;

  return {
    users,
    loading,
    error,
    currentUserRole,
    isOwner,
    fetchUsers,
    addUser,
    updateUserRole,
    removeUser,
    canInviteUsers,
    canManageAdmins,
    canManageSchedulers,
    canUpdateUser,
    canRemoveUser
  };
}