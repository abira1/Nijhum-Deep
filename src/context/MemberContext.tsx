import React, { useEffect, useState, createContext, useContext } from 'react';
import memberService, { Member } from '../services/memberService';
import { Unsubscribe } from 'firebase/database';
import { useAuth } from './AuthContext';

interface MemberContextType {
  members: Member[];
  loading: boolean;
  error: string | null;
  addMember: (name: string) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  updateMember: (id: string, name: string) => Promise<void>;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export const MemberProvider: React.FC<{
  children: React.ReactNode;
}> = ({
  children
}) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    const initializeMembers = async () => {
      // Don't initialize members if user is not authenticated
      if (!isAuthenticated) {
        setMembers([]);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Check if there are members in localStorage to migrate
        const savedMembers = localStorage.getItem('members');
        if (savedMembers) {
          const localMembers = JSON.parse(savedMembers);
          if (localMembers.length > 0) {
            console.log('Migrating members from localStorage to Firebase...');
            await memberService.importMembers(localMembers);
            localStorage.removeItem('members'); // Remove after successful migration
            console.log('Members migrated successfully');
          }
        }

        // Subscribe to real-time updates
        unsubscribe = memberService.subscribeToMembers(
          (updatedMembers) => {
            setMembers(updatedMembers);
            setLoading(false);
          },
          (error) => {
            console.error('Error subscribing to members:', error);
            setError('Failed to load members. Please check your connection.');
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error initializing members:', error);
        setError('Failed to initialize members. Please refresh the page.');
        setLoading(false);
      }
    };

    // Only initialize members after auth loading is complete
    if (!authLoading) {
      initializeMembers();
    }

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAuthenticated, authLoading]);
  const addMember = async (name: string): Promise<void> => {
    try {
      setError(null);

      // Validate member name
      const validation = memberService.validateMemberName(name);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Check if name already exists
      const nameExists = await memberService.memberNameExists(name);
      if (nameExists) {
        throw new Error('A member with this name already exists');
      }

      await memberService.addMember(name);
    } catch (error) {
      console.error('Error adding member:', error);
      setError(error instanceof Error ? error.message : 'Failed to add member. Please try again.');
      throw error;
    }
  };

  const removeMember = async (id: string): Promise<void> => {
    try {
      setError(null);
      await memberService.removeMember(id);
    } catch (error) {
      console.error('Error removing member:', error);
      setError('Failed to remove member. Please try again.');
      throw error;
    }
  };

  const updateMember = async (id: string, name: string): Promise<void> => {
    try {
      setError(null);

      // Validate member name
      const validation = memberService.validateMemberName(name);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Check if name already exists (excluding current member)
      const nameExists = await memberService.memberNameExists(name, id);
      if (nameExists) {
        throw new Error('A member with this name already exists');
      }

      await memberService.updateMember(id, name);
    } catch (error) {
      console.error('Error updating member:', error);
      setError(error instanceof Error ? error.message : 'Failed to update member. Please try again.');
      throw error;
    }
  };

  return <MemberContext.Provider value={{
    members,
    loading,
    error,
    addMember,
    removeMember,
    updateMember
  }}>
      {children}
    </MemberContext.Provider>;
};
export const useMembers = () => {
  const context = useContext(MemberContext);
  if (context === undefined) {
    throw new Error('useMembers must be used within a MemberProvider');
  }
  return context;
};