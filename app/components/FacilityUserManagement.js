'use client';

import { useState } from 'react';
import { useFacilityUsers } from '@/app/hooks/useFacilityUsers';

export default function FacilityUserManagement({ user, facilityId }) {
  console.log('🏢 FacilityUserManagement received facilityId:', facilityId);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [addUserForm, setAddUserForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: 'scheduler'
  });
  const [editUserForm, setEditUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: ''
  });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const {
    users,
    loading,
    error,
    currentUserRole,
    addUser,
    updateUser,
    updateUserRole,
    removeUser,
    canInviteUsers,
    canUpdateUser,
    canRemoveUser,
    isOwner
  } = useFacilityUsers(facilityId, user);



  async function handleAddUser() {
    try {
      setAddUserLoading(true);
      
      const result = await addUser(addUserForm);
      
      if (result.success) {
        alert('User created successfully! They can now login with their credentials.');
        setShowInviteModal(false);
        setAddUserForm({ email: '', password: '', firstName: '', lastName: '', phoneNumber: '', role: 'scheduler' });
      } else {
        alert(result.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user. Please try again.');
    } finally {
      setAddUserLoading(false);
    }
  }

  function handleEditClick(facilityUser) {
    // Get profile data from the user
    const profile = users.find(u => u.user_id === facilityUser.user_id);
    
    setEditingUser(facilityUser);
    setEditUserForm({
      email: facilityUser.email || '',
      firstName: facilityUser.firstName || '',
      lastName: facilityUser.lastName || '',
      phoneNumber: profile?.phone_number || '',
      role: facilityUser.role
    });
    setShowEditModal(true);
  }

  async function handleEditUser() {
    try {
      setEditUserLoading(true);
      
      const result = await updateUser(editingUser.user_id, editUserForm);
      
      if (result.success) {
        alert('User details updated successfully!');
        setShowEditModal(false);
        setEditingUser(null);
        setEditUserForm({ email: '', firstName: '', lastName: '', phoneNumber: '', role: '' });
      } else {
        alert(result.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    } finally {
      setEditUserLoading(false);
    }
  }

  async function handleUpdateUserRole(userId, newRole) {
    // Find the user being updated
    const targetUser = users.find(u => u.user_id === userId);
    if (!targetUser) return;

    // Professional confirmation with typed confirmation
    const roleNames = {
      'super_admin': 'SUPER ADMIN',
      'admin': 'ADMIN', 
      'scheduler': 'SCHEDULER'
    };

    const currentRoleName = roleNames[targetUser.role];
    const newRoleName = roleNames[newRole];

    // Create professional confirmation message
    const permissions = {
      'super_admin': 'Full administrative access - can manage all users and settings',
      'admin': 'Administrative access - can manage schedulers and operations', 
      'scheduler': 'Limited access - can book rides and manage clients only'
    };

    const warningMessage = `⚠️  ROLE CHANGE CONFIRMATION\n\nUser: ${targetUser.firstName} ${targetUser.lastName}\nCurrent Role: ${currentRoleName}\nNew Role: ${newRoleName}\n\nNew Permissions: ${permissions[newRole]}\n\nThis change takes effect immediately and will modify the user's access level.\n\nTo confirm this role change, please type: ${newRoleName}`;

    const userInput = prompt(warningMessage);

    // Check if user typed the correct role name
    if (userInput !== newRoleName) {
      if (userInput !== null) { // null means they cancelled
        alert('❌ Role change cancelled. You must type the exact role name to confirm.');
      }
      return;
    }

    try {
      setActionLoading(userId);
      
      const result = await updateUserRole(userId, newRole);
      
      if (result.success) {
        alert(`✅ SUCCESS\n\n${targetUser.firstName} ${targetUser.lastName}'s role has been changed to ${newRoleName}.\n\nThey will have ${permissions[newRole].toLowerCase()} when they next log in.`);
      } else {
        alert(`❌ FAILED\n\n${result.error || 'Failed to update user role'}`);
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      if (error.message.includes('owner')) {
        alert('❌ PERMISSION DENIED\n\nCannot change facility owner role. The owner must always remain Super Admin for security and compliance reasons.');
      } else {
        alert('❌ ERROR\n\nFailed to update user role. Please check your connection and try again.');
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemoveUser(userId) {
    if (!confirm('Are you sure you want to remove this user from the facility?')) {
      return;
    }

    try {
      setActionLoading(userId);
      
      const result = await removeUser(userId);
      
      if (result.success) {
        alert('User removed successfully');
      } else {
        alert(result.error || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user');
    } finally {
      setActionLoading(null);
    }
  }



  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'scheduler': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'scheduler': return 'Scheduler';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#7CCFD0]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">Manage facility staff and their permissions</p>
        </div>
        {canInviteUsers && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-[#7CCFD0] hover:bg-[#60BFC0] text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Add User
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {/* Permission Levels Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
        <div className="flex items-center mb-3">
          <span className="text-blue-600 mr-2">🛡️</span>
          <h3 className="font-semibold text-blue-900">Access Control & Permission Levels</h3>
        </div>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-start">
            <span className="inline-block w-28 font-semibold text-purple-700 flex-shrink-0">Super Admin:</span>
            <span>Full administrative access. Can manage all users and facility settings.</span>
          </div>
          <div className="flex items-start">
            <span className="inline-block w-28 font-semibold text-blue-700 flex-shrink-0">Admin:</span>
            <span>Can manage schedulers and facility operations. Cannot manage other admins.</span>
          </div>
          <div className="flex items-start">
            <span className="inline-block w-28 font-semibold text-green-700 flex-shrink-0">Scheduler:</span>
            <span>Can book rides and manage clients. Limited administrative access.</span>
          </div>
          
          <div className="mt-4 pt-3 border-t border-blue-200 bg-blue-100 rounded-md p-3">
            <div className="flex items-start">
              <span className="text-purple-600 mr-2">👑</span>
              <div>
                <div className="font-semibold text-purple-800">Facility Owner</div>
                <div className="text-xs text-purple-700 mt-1">
                  By default, the facility account holder is assigned Super Admin status as the facility owner. 
                  This role is protected and cannot be changed to ensure continuous facility management and compliance with security protocols.
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-3 pt-2 border-t border-blue-200">
            <div className="flex items-start text-xs">
              <span className="text-blue-600 mr-2">🔒</span>
              <div>
                <span className="font-semibold">Security Protocol:</span> Role changes require typing the target role name to confirm. 
                All changes take effect immediately and are logged for audit purposes.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Facility Users ({users.length})</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {users.map((facilityUser) => (
            <div key={facilityUser.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-gray-100 rounded-full p-2">
                  <span className="text-lg">👤</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {facilityUser.firstName} {facilityUser.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{facilityUser.email}</p>
                  <p className="text-xs text-gray-500">
                    Invited {new Date(facilityUser.invited_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Role Badge */}
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getRoleColor(facilityUser.role)}`}>
                    {getRoleLabel(facilityUser.role)}
                  </span>
                  {facilityUser.is_owner === true && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                      Owner
                    </span>
                  )}
                </div>
                
                {/* Status Badge */}
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  facilityUser.status === 'active' ? 'bg-green-100 text-green-800' :
                  facilityUser.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {facilityUser.status}
                </span>
                
                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {/* Edit Button */}
                  {canUpdateUser(facilityUser.role) && (
                    <button
                      onClick={() => handleEditClick(facilityUser)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                  )}
                  
                  {/* Role Change Dropdown */}
                  {canUpdateUser(facilityUser.role) && facilityUser.is_owner !== true && (
                    <div className="flex items-center space-x-1">
                      <select
                        value={facilityUser.role}
                        onChange={(e) => handleUpdateUserRole(facilityUser.user_id, e.target.value)}
                        disabled={actionLoading === facilityUser.user_id}
                        className="text-xs border border-gray-300 rounded px-2 py-1 disabled:opacity-50"
                        title="Role changes require confirmation"
                      >
                        <option value="scheduler">Scheduler</option>
                        {currentUserRole === 'super_admin' && <option value="admin">Admin</option>}
                        {currentUserRole === 'super_admin' && <option value="super_admin">Super Admin</option>}
                      </select>
                      <span className="text-xs text-gray-400" title="Role changes require typing confirmation">🔒</span>
                    </div>
                  )}
                  
                  {/* Show locked message for owner */}
                  {facilityUser.is_owner === true && (
                    <span className="text-xs text-gray-500 italic">
                      Role locked (Owner)
                    </span>
                  )}
                  
                  {/* Remove Button */}
                  {canRemoveUser(facilityUser.user_id, facilityUser.role) && facilityUser.is_owner !== true && (
                    <button
                      onClick={() => handleRemoveUser(facilityUser.user_id)}
                      disabled={actionLoading === facilityUser.user_id}
                      className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                    >
                      {actionLoading === facilityUser.user_id ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                  
                  {/* Show protected message for owner */}
                  {facilityUser.is_owner === true && (
                    <span className="text-xs text-gray-500 italic">
                      Protected
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {users.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No users found. Add your first team member to get started.
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address (Username)
                </label>
                <input
                  type="email"
                  value={addUserForm.email}
                  onChange={(e) => setAddUserForm({...addUserForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  placeholder="user@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={addUserForm.password}
                  onChange={(e) => setAddUserForm({...addUserForm, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  placeholder="Enter password"
                  minLength="6"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={addUserForm.firstName}
                    onChange={(e) => setAddUserForm({...addUserForm, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={addUserForm.lastName}
                    onChange={(e) => setAddUserForm({...addUserForm, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={addUserForm.phoneNumber}
                  onChange={(e) => setAddUserForm({...addUserForm, phoneNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  placeholder="(123) 456-7890"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={addUserForm.role}
                  onChange={(e) => setAddUserForm({...addUserForm, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                >
                  <option value="scheduler">Scheduler</option>
                  <option value="admin">Admin</option>
                  {currentUserRole === 'super_admin' && (
                    <option value="super_admin">Super Admin</option>
                  )}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={addUserLoading || !addUserForm.email || !addUserForm.password || !addUserForm.firstName || !addUserForm.lastName}
                className="px-4 py-2 bg-[#7CCFD0] text-white rounded-md hover:bg-[#60BFC0] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addUserLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editUserForm.firstName}
                    onChange={(e) => setEditUserForm({...editUserForm, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editUserForm.lastName}
                    onChange={(e) => setEditUserForm({...editUserForm, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editUserForm.phoneNumber}
                  onChange={(e) => setEditUserForm({...editUserForm, phoneNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  placeholder="(123) 456-7890"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm({...editUserForm, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  disabled={editingUser?.is_owner === true}
                >
                  <option value="scheduler">Scheduler</option>
                  <option value="admin">Admin</option>
                  {currentUserRole === 'super_admin' && (
                    <option value="super_admin">Super Admin</option>
                  )}
                </select>
                {editingUser?.is_owner === true && (
                  <p className="text-xs text-gray-500 mt-1">Owner role cannot be changed</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                  setEditUserForm({ email: '', firstName: '', lastName: '', phoneNumber: '', role: '' });
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                disabled={editUserLoading || !editUserForm.email || !editUserForm.firstName || !editUserForm.lastName}
                className="px-4 py-2 bg-[#7CCFD0] text-white rounded-md hover:bg-[#60BFC0] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editUserLoading ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}