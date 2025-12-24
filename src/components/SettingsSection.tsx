import React, { useState } from 'react';
import { useMembers } from '../context/MemberContext';
import { useAuth } from '../context/AuthContext';
import RetroWindow from './ui/RetroWindow';
import RetroInput from './ui/RetroInput';
import RetroButton from './ui/RetroButton';
import GoogleLogin from './ui/GoogleLogin';
import PWASettings from './PWASettings';
import { UserPlusIcon, UserMinusIcon, UserIcon, EditIcon, LogOutIcon, LoaderIcon, ShieldIcon } from 'lucide-react';
const SettingsSection = () => {
  const {
    members,
    addMember,
    removeMember,
    updateMember,
    loading,
    error
  } = useMembers();
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const [newMemberName, setNewMemberName] = useState('');
  const [editingMember, setEditingMember] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);
  const [deletingMembers, setDeletingMembers] = useState<Set<string>>(new Set());
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    setIsAddingMember(true);
    try {
      await addMember(newMemberName.trim());
      setNewMemberName('');
    } catch (error) {
      console.error('Failed to add member:', error);
    } finally {
      setIsAddingMember(false);
    }
  };
  const handleStartEdit = (member: {
    id: string;
    name: string;
  }) => {
    setEditingMember(member);
  };
  const handleCancelEdit = () => {
    setEditingMember(null);
  };
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editingMember.name.trim()) return;

    setIsUpdatingMember(true);
    try {
      await updateMember(editingMember.id, editingMember.name.trim());
      setEditingMember(null);
    } catch (error) {
      console.error('Failed to update member:', error);
    } finally {
      setIsUpdatingMember(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    setDeletingMembers(prev => new Set(prev).add(id));
    try {
      await removeMember(id);
    } catch (error) {
      console.error('Failed to remove member:', error);
    } finally {
      setDeletingMembers(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingMember) {
      setEditingMember({
        ...editingMember,
        name: e.target.value
      });
    }
  };
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  if (loading) {
    return <div className="w-full">
        <RetroWindow title="SETTINGS" className="mb-8">
          <div className="flex items-center justify-center py-8">
            <LoaderIcon className="animate-spin mr-2" />
            <span className="text-lg">Loading settings...</span>
          </div>
        </RetroWindow>
      </div>;
  }

  // Don't show member management errors if user is not authenticated
  if (!isAuthenticated) {
    return <div className="w-full">
        <RetroWindow title="ACCOUNT" className="mb-8">
          <div className="border-4 border-black p-6 mb-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold mb-2">
                Sign in to access settings
              </h3>
              <p className="mb-4">
                Connect with your Google account to manage members and access all features.
              </p>
            </div>
            <GoogleLogin />
          </div>
        </RetroWindow>
      </div>;
  }

  return <div className="w-full">
      <RetroWindow title="ACCOUNT" className="mb-8">
        {error && <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 mb-4">
            <strong>Error:</strong> {error}
          </div>}
        {isAuthenticated && user ? <div className="border-4 border-black p-4 mb-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="w-20 h-20 border-4 border-black overflow-hidden flex-shrink-0">
                <img
                  src={user.photoURL || 'https://via.placeholder.com/150'}
                  alt={user.displayName || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-grow text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <h3 className="text-xl font-bold">{user.displayName}</h3>
                  {isAdmin && (
                    <div className="flex items-center bg-yellow-200 border-2 border-yellow-600 px-2 py-1 text-xs font-bold">
                      <ShieldIcon className="w-3 h-3 mr-1" />
                      ADMIN
                    </div>
                  )}
                </div>
                <p className="font-mono text-sm">{user.email}</p>
              </div>
              <RetroButton variant="secondary" onClick={handleLogout} className="flex items-center">
                <LogOutIcon className="w-4 h-4 mr-2" />
                SIGN OUT
              </RetroButton>
            </div>
          </div> : <div className="border-4 border-black p-6 mb-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold mb-2">
                Sign in to sync your data
              </h3>
              <p className="mb-4">
                Connect with your Google account to save your meal data across
                devices and access all features.
              </p>
            </div>
            <GoogleLogin />
          </div>}
      </RetroWindow>

      {/* PWA Settings Section */}
      <RetroWindow title="APP SETTINGS" className="mb-8">
        <PWASettings />
      </RetroWindow>

      <RetroWindow title="MEMBER MANAGEMENT" className="mb-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Add New Member</h2>
          <form onSubmit={handleAddMember} className="border-4 border-black p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <RetroInput label="Member Name" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} required placeholder="Enter member name" className="flex-grow" />
              <div className="flex items-end">
                <RetroButton
                  type="submit"
                  className="flex items-center"
                  disabled={isAddingMember}
                >
                  {isAddingMember ? (
                    <>
                      <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                      ADDING...
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="w-4 h-4 mr-2" />
                      ADD MEMBER
                    </>
                  )}
                </RetroButton>
              </div>
            </div>
          </form>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Manage Members</h2>
          <div className="border-4 border-black">
            {members.length > 0 ? <div className="divide-y-2 divide-black">
                {members.map(member => <div key={member.id} className="p-4 flex justify-between items-center">
                    {editingMember && editingMember.id === member.id ? <form onSubmit={handleSaveEdit} className="flex-grow flex flex-wrap gap-2">
                        <input type="text" value={editingMember.name} onChange={handleEditChange} className="flex-grow min-w-[200px] p-2 border-2 border-black font-mono mb-2 sm:mb-0" autoFocus />
                        <div className="flex gap-2 w-full sm:w-auto">
                          <RetroButton
                            type="submit"
                            className="whitespace-nowrap"
                            disabled={isUpdatingMember}
                          >
                            {isUpdatingMember ? (
                              <>
                                <LoaderIcon className="w-4 h-4 mr-1 animate-spin" />
                                SAVING...
                              </>
                            ) : (
                              'SAVE'
                            )}
                          </RetroButton>
                          <RetroButton
                            variant="secondary"
                            onClick={handleCancelEdit}
                            className="whitespace-nowrap"
                            disabled={isUpdatingMember}
                          >
                            CANCEL
                          </RetroButton>
                        </div>
                      </form> : <>
                        <div className="flex items-center">
                          <UserIcon className="w-5 h-5 mr-3" />
                          <span className="text-lg font-bold">
                            {member.name}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <RetroButton variant="secondary" onClick={() => handleStartEdit(member)} className="flex items-center">
                            <EditIcon className="w-4 h-4" />
                          </RetroButton>
                          <RetroButton
                            variant="secondary"
                            onClick={() => handleRemoveMember(member.id)}
                            className="flex items-center"
                            disabled={deletingMembers.has(member.id)}
                          >
                            {deletingMembers.has(member.id) ? (
                              <LoaderIcon className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserMinusIcon className="w-4 h-4" />
                            )}
                          </RetroButton>
                        </div>
                      </>}
                  </div>)}
              </div> : <div className="p-6 text-center">
                <p className="text-lg">No members added yet.</p>
                <p>Add your first member using the form above.</p>
              </div>}
          </div>
        </div>
      </RetroWindow>
    </div>;
};
export default SettingsSection;