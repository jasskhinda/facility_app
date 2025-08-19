'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import DashboardLayout from '@/app/components/DashboardLayout';
import { useLoading } from '@/app/components/LoadingProvider';

export default function UserDetailsPage({ params }) {
  const router = useRouter();
  const { userId } = params;
  const { hideLoading } = useLoading();
  const [user, setUser] = useState(null);
  const [facilityUser, setFacilityUser] = useState(null);
  const [loading, setLoading] = useState(false); // Start with false to avoid initial loading state
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [session, setSession] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [facilityId, setFacilityId] = useState(null);

  const [editForm, setEditForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [forceRender, setForceRender] = useState(0); // Force re-render counter
  const hasLoadedRef = useRef(false);
  const isMountedRef = useRef(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  async function loadUserData() {
    try {
      console.log('🔍 Starting loadUserData for userId:', userId);
      // Don't set loading to true if we already have data
      if (!user) {
        setLoading(true);
      }
      setError(null);

      // Get current session first and set it immediately
      console.log('🔑 Getting current session...');
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log('👤 Current session:', currentSession?.user?.email);
      
      // Set session immediately so DashboardLayout has user data and won't show loading
      if (currentSession) {
        setSession(currentSession);
        console.log('✅ Session set for DashboardLayout');
      }

      if (!currentSession?.user) {
        console.log('❌ No session found, redirecting to login');
        router.push('/login');
        return;
      }

      // Get current user's facility and role
      console.log('🏢 Getting current user facility data...');
      const { data: currentFacilityUser, error: facilityUserError } = await supabase
        .from('facility_users')
        .select('role, facility_id')
        .eq('user_id', currentSession.user.id)
        .eq('status', 'active')
        .single();

      console.log('🏢 Current facility user data:', currentFacilityUser);
      console.log('❌ Current facility user error:', facilityUserError);

      let targetFacilityId = null;

      if (facilityUserError) {
        // Try fallback to profiles table for legacy users
        console.log('🔄 Trying fallback to profiles table...');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, facility_id')
          .eq('id', currentSession.user.id)
          .single();

        console.log('👤 Profile fallback data:', profileData);
        console.log('❌ Profile fallback error:', profileError);

        if (profileError || !profileData || profileData.role !== 'facility') {
          throw new Error('Access denied: You are not authorized to view this page');
        }

        setCurrentUserRole('super_admin'); // Default for legacy users
        setFacilityId(profileData.facility_id);
        targetFacilityId = profileData.facility_id;
      } else {
        setCurrentUserRole(currentFacilityUser.role);
        setFacilityId(currentFacilityUser.facility_id);
        targetFacilityId = currentFacilityUser.facility_id;
      }
      console.log('🎯 Target facility ID:', targetFacilityId);

      if (!targetFacilityId) {
        throw new Error('No facility associated with your account');
      }

      // Load the target user's profile
      console.log('👤 Loading target user profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('👤 Target user profile:', profile);
      console.log('❌ Target user profile error:', profileError);

      if (profileError) {
        throw new Error('User not found: ' + profileError.message);
      }

      // Load facility user data
      console.log('🏢 Loading target user facility data...');
      const { data: targetFacilityUser, error: targetFacilityError } = await supabase
        .from('facility_users')
        .select('*')
        .eq('user_id', userId)
        .eq('facility_id', targetFacilityId)
        .single();

      console.log('🏢 Target facility user data:', targetFacilityUser);
      console.log('❌ Target facility user error:', targetFacilityError);

      if (targetFacilityError) {
        throw new Error('User not found in your facility: ' + targetFacilityError.message);
      }

      console.log('✅ All data loaded successfully');
      setUser(profile);
      setFacilityUser(targetFacilityUser);
      setEditForm({
        email: profile.email || '',
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phoneNumber: profile.phone_number || '',
        role: targetFacilityUser.role || ''
      });
      
      // Set loading to false and hide global loading
      setLoading(false);
      hideLoading(); // Hide global loading overlay
      // Force a re-render
      setForceRender(prev => prev + 1);
      // Force hide again after a brief delay to ensure it's dismissed
      setTimeout(() => {
        setLoading(false);
        hideLoading();
        setForceRender(prev => prev + 1); // Force another re-render
        console.log('🏁 Force dismissed global loading and re-rendered');
      }, 100);
      console.log('🏁 Loading set to false and global loading hidden');

    } catch (error) {
      console.error('💥 Error loading user:', error);
      setError(error.message);
    } finally {
      console.log('🏁 Loading finished');
      setLoading(false);
      hideLoading(); // Always hide global loading even on error
    }
  }

  // Load data immediately on mount
  useEffect(() => {
    if (userId && !hasLoadedRef.current) {
      console.log('🔄 useEffect triggered for userId:', userId);
      hasLoadedRef.current = true;
      hideLoading(); // Hide global loading immediately
      loadUserData();
    }
    
    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      hideLoading();
    };
  }, [userId]);

  function canEditUser() {
    if (currentUserRole === 'super_admin') return true;
    if (currentUserRole === 'admin' && facilityUser?.role === 'scheduler') return true;
    return false;
  }

  function canManagePassword() {
    return currentUserRole === 'super_admin';
  }

  function canDeleteUser() {
    return currentUserRole === 'super_admin' && !facilityUser?.is_owner;
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
    setMessage(null);
    setError(null);
  }

  function handlePasswordChange(e) {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
    setMessage(null);
    setError(null);
  }

  async function handleChangePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setChangingPassword(true);
      setError(null);

      const response = await fetch('/api/facility/change-user-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          newPassword: passwordForm.newPassword
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to change password');
      }

      setMessage('Password changed successfully!');
      setShowPasswordChange(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });

    } catch (error) {
      console.error('Error changing password:', error);
      setError(error.message);
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDeleteUser() {
    const confirmMessage = `Are you sure you want to delete ${user?.first_name} ${user?.last_name}?\n\nThis action cannot be undone. Type "DELETE" to confirm.`;
    const confirmation = prompt(confirmMessage);

    if (confirmation !== 'DELETE') {
      if (confirmation !== null) {
        alert('User deletion cancelled. You must type "DELETE" to confirm.');
      }
      return;
    }

    try {
      setError(null);

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

      alert('User deleted successfully');
      router.push('/dashboard/facility-settings');

    } catch (error) {
      console.error('Error deleting user:', error);
      setError(error.message);
    }
  }

  async function handleSaveChanges() {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/facility/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId,
          userId,
          ...editForm
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user');
      }

      setMessage('User details updated successfully!');
      setEditMode(false);
      
      // Reload user data
      await loadUserData();

    } catch (error) {
      console.error('Error updating user:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function getRoleLabel(role) {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'scheduler': return 'Scheduler';
      default: return role;
    }
  }

  function getRoleColor(role) {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'scheduler': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // Add a timeout fallback - if loading takes too long, show the page anyway
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Loading timeout - forcing page render');
        setLoading(false);
        hideLoading();
      }
    }, 2000); // 2 second timeout
    
    return () => clearTimeout(timeout);
  }, [loading]);

  // Force a re-render when user data is available
  useEffect(() => {
    if (user && facilityUser) {
      console.log('📊 User data available, forcing render');
      setLoading(false);
      hideLoading();
    }
  }, [user, facilityUser]);

  // Wait for session to be loaded before rendering anything
  if (session === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7CCFD0]"></div>
      </div>
    );
  }

  // Only show loading if we don't have user data yet and we have a session
  if (loading && !user && !facilityUser) {
    return (
      <DashboardLayout user={session?.user}>
        <div className="flex justify-center items-center py-12">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#7CCFD0]"></div>
              <p className="text-gray-600">Loading user details...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !user) {
    return (
      <DashboardLayout user={session?.user}>
        <div className="w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading User</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="space-x-3">
              <button
                onClick={() => {
                  setError(null);
                  hasLoadedRef.current = false;
                  loadUserData();
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/dashboard/facility-settings')}
                className="text-red-600 hover:text-red-800 font-medium"
              >
                ← Back to User Management
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Always provide session user to DashboardLayout to prevent its internal loading state
  return (
    <DashboardLayout user={session?.user || user}>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard/facility-settings')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to User Management</span>
            </button>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
            <p className="text-gray-600">View and manage user information</p>
          </div>
          
          <div className="flex space-x-3">
            {canEditUser() && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="bg-[#7CCFD0] hover:bg-[#60BFC0] text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Edit User
              </button>
            )}
            
            {canManagePassword() && !editMode && (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Change Password
              </button>
            )}
            
            {canDeleteUser() && !editMode && (
              <button
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Delete User
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{message}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* User Information Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="bg-gray-100 rounded-full p-3">
                  <span className="text-2xl">👤</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {user?.first_name} {user?.last_name}
                  </h2>
                  <p className="text-gray-600">{user?.email}</p>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getRoleColor(facilityUser?.role)}`}>
                      {getRoleLabel(facilityUser?.role)}
                    </span>
                    {facilityUser?.is_owner && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Owner
                      </span>
                    )}
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      {facilityUser?.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* User Details */}
            {editMode ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={editForm.phoneNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent"
                      placeholder="(123) 456-7890"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={editForm.firstName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={editForm.lastName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      name="role"
                      value={editForm.role}
                      onChange={handleInputChange}
                      disabled={facilityUser?.is_owner}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="scheduler">Scheduler</option>
                      <option value="admin">Admin</option>
                      {currentUserRole === 'super_admin' && (
                        <option value="super_admin">Super Admin</option>
                      )}
                    </select>
                    {facilityUser?.is_owner && (
                      <p className="text-xs text-gray-500 mt-1">Owner role cannot be changed</p>
                    )}
                  </div>
                </div>

                {/* Edit Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setEditForm({
                        email: user?.email || '',
                        firstName: user?.first_name || '',
                        lastName: user?.last_name || '',
                        phoneNumber: user?.phone_number || '',
                        role: facilityUser?.role || ''
                      });
                      setError(null);
                      setMessage(null);
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving || !editForm.email || !editForm.firstName || !editForm.lastName}
                    className="px-4 py-2 bg-[#7CCFD0] text-white rounded-md hover:bg-[#60BFC0] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Email Address</h3>
                  <p className="text-gray-900">{user?.email || 'Not provided'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Phone Number</h3>
                  <p className="text-gray-900">{user?.phone_number || 'Not provided'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">First Name</h3>
                  <p className="text-gray-900">{user?.first_name || 'Not provided'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Last Name</h3>
                  <p className="text-gray-900">{user?.last_name || 'Not provided'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Role</h3>
                  <p className="text-gray-900">{getRoleLabel(facilityUser?.role)}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Member Since</h3>
                  <p className="text-gray-900">
                    {facilityUser?.invited_at ? new Date(facilityUser.invited_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">User ID</h4>
                <p className="text-gray-900 font-mono text-sm">{userId}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                <p className="text-gray-900">{facilityUser?.status}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Invited By</h4>
                <p className="text-gray-900">{facilityUser?.invited_by || 'System'}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Last Updated</h4>
                <p className="text-gray-900">
                  {user?.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Modal */}
        {showPasswordChange && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Change Password for {user?.first_name} {user?.last_name}
              </h3>
              
              {/* Error and Success Messages */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}
              
              {message && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-800 text-sm">{message}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                    placeholder="Enter new password"
                    minLength="6"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                    placeholder="Confirm new password"
                    minLength="6"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordForm({ newPassword: '', confirmPassword: '' });
                    setError(null);
                    setMessage(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-start">
                  <span className="text-yellow-600 mr-2">⚠️</span>
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Important:</p>
                    <p>The user will need to sign in again with their new password. Make sure to communicate the new password securely.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}