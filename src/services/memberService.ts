import firebaseService from './firebaseService';
import { Unsubscribe } from 'firebase/database';

export interface Member {
  id: string;
  name: string;
  timestamp?: number;
}

export class MemberService {
  private basePath = 'members';

  // Add a new member
  async addMember(name: string): Promise<string> {
    try {
      const memberData = {
        name,
        timestamp: firebaseService.getTimestamp()
      };
      const memberId = await firebaseService.pushData(this.basePath, memberData);
      return memberId;
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  }

  // Remove a member
  async removeMember(id: string): Promise<void> {
    try {
      await firebaseService.removeData(`${this.basePath}/${id}`);
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  // Update a member
  async updateMember(id: string, name: string): Promise<void> {
    try {
      const memberData = {
        name,
        timestamp: firebaseService.getTimestamp()
      };
      await firebaseService.setData(`${this.basePath}/${id}`, memberData);
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  }

  // Get all members
  async getAllMembers(): Promise<Member[]> {
    try {
      const membersData = await firebaseService.getData(this.basePath);
      if (!membersData) return [];
      
      return Object.keys(membersData).map(key => ({
        id: key,
        ...membersData[key]
      }));
    } catch (error) {
      console.error('Error getting all members:', error);
      throw error;
    }
  }

  // Get a specific member
  async getMember(id: string): Promise<Member | null> {
    try {
      const memberData = await firebaseService.getData(`${this.basePath}/${id}`);
      if (!memberData) return null;
      
      return {
        id,
        ...memberData
      };
    } catch (error) {
      console.error('Error getting member:', error);
      throw error;
    }
  }

  // Subscribe to real-time member updates
  subscribeToMembers(
    callback: (members: Member[]) => void,
    errorCallback?: (error: Error) => void
  ): Unsubscribe {
    return firebaseService.subscribeToData(
      this.basePath,
      (data) => {
        const members = data ? firebaseService.objectToArray(data) : [];
        callback(members);
      },
      errorCallback
    );
  }

  // Check if member name already exists
  async memberNameExists(name: string, excludeId?: string): Promise<boolean> {
    try {
      const members = await this.getAllMembers();
      return members.some(member => 
        member.name.toLowerCase() === name.toLowerCase() && 
        member.id !== excludeId
      );
    } catch (error) {
      console.error('Error checking member name:', error);
      return false;
    }
  }

  // Bulk import members (useful for migration from localStorage)
  async importMembers(members: Member[]): Promise<void> {
    try {
      const importPromises = members.map(member => {
        const memberData = {
          name: member.name,
          timestamp: member.timestamp || firebaseService.getTimestamp()
        };
        return firebaseService.setData(`${this.basePath}/${member.id}`, memberData);
      });
      
      await Promise.all(importPromises);
    } catch (error) {
      console.error('Error importing members:', error);
      throw error;
    }
  }

  // Get member statistics
  async getMemberStats(memberId: string): Promise<{
    totalMeals: number;
    totalExpenses: number;
    joinDate: string;
  }> {
    try {
      // This would require integration with meal and expense services
      // For now, return basic info
      const member = await this.getMember(memberId);
      if (!member) {
        throw new Error('Member not found');
      }

      return {
        totalMeals: 0, // Would be calculated from meal service
        totalExpenses: 0, // Would be calculated from expense service
        joinDate: member.timestamp ? new Date(member.timestamp).toISOString().split('T')[0] : 'Unknown'
      };
    } catch (error) {
      console.error('Error getting member stats:', error);
      throw error;
    }
  }

  // Search members by name
  searchMembers(members: Member[], searchTerm: string): Member[] {
    if (!searchTerm.trim()) return members;
    
    const term = searchTerm.toLowerCase();
    return members.filter(member => 
      member.name.toLowerCase().includes(term)
    );
  }

  // Sort members by name
  sortMembersByName(members: Member[], ascending: boolean = true): Member[] {
    return [...members].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return ascending ? comparison : -comparison;
    });
  }

  // Sort members by join date
  sortMembersByJoinDate(members: Member[], ascending: boolean = true): Member[] {
    return [...members].sort((a, b) => {
      const aTime = a.timestamp || 0;
      const bTime = b.timestamp || 0;
      return ascending ? aTime - bTime : bTime - aTime;
    });
  }

  // Validate member name
  validateMemberName(name: string): { isValid: boolean; error?: string } {
    if (!name.trim()) {
      return { isValid: false, error: 'Member name is required' };
    }
    
    if (name.trim().length < 2) {
      return { isValid: false, error: 'Member name must be at least 2 characters long' };
    }
    
    if (name.trim().length > 50) {
      return { isValid: false, error: 'Member name must be less than 50 characters' };
    }
    
    // Check for special characters (allow only letters, numbers, spaces, and common punctuation)
    const validNameRegex = /^[a-zA-Z0-9\s\-\.\']+$/;
    if (!validNameRegex.test(name.trim())) {
      return { isValid: false, error: 'Member name contains invalid characters' };
    }
    
    return { isValid: true };
  }

  // Get default members for initial setup
  getDefaultMembers(): Member[] {
    return [
      { id: '1', name: 'Rahim', timestamp: firebaseService.getTimestamp() },
      { id: '2', name: 'Karim', timestamp: firebaseService.getTimestamp() },
      { id: '3', name: 'Jashim', timestamp: firebaseService.getTimestamp() }
    ];
  }
}

// Create singleton instance
const memberService = new MemberService();
export default memberService;
