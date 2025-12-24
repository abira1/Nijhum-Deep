/**
 * Utility functions for managing member name persistence in local storage
 * Provides functionality to save, retrieve, and clear selected member names
 * for the expense form with proper error handling and fallback behavior.
 */

// Local storage key for storing the selected member ID
const MEMBER_PERSISTENCE_KEY = 'nijhum_dip_selected_member_id';

/**
 * Save the selected member ID to local storage
 * @param memberId - The ID of the selected member
 */
export const saveSelectedMemberId = (memberId: string): void => {
  try {
    if (!memberId || typeof memberId !== 'string') {
      console.warn('[MemberPersistence] Invalid member ID provided:', memberId);
      return;
    }

    localStorage.setItem(MEMBER_PERSISTENCE_KEY, memberId);
    console.log('[MemberPersistence] Member ID saved to local storage:', memberId);
  } catch (error) {
    console.error('[MemberPersistence] Failed to save member ID to local storage:', error);
    // Fail silently - local storage might be disabled or full
  }
};

/**
 * Retrieve the selected member ID from local storage
 * @returns The stored member ID or null if not found/invalid
 */
export const getSelectedMemberId = (): string | null => {
  try {
    const storedMemberId = localStorage.getItem(MEMBER_PERSISTENCE_KEY);
    
    if (!storedMemberId) {
      return null;
    }

    // Validate that it's a non-empty string
    if (typeof storedMemberId === 'string' && storedMemberId.trim().length > 0) {
      console.log('[MemberPersistence] Retrieved member ID from local storage:', storedMemberId);
      return storedMemberId.trim();
    }

    return null;
  } catch (error) {
    console.error('[MemberPersistence] Failed to retrieve member ID from local storage:', error);
    return null;
  }
};

/**
 * Clear the selected member ID from local storage
 * This should be called when user logs out or switches accounts
 */
export const clearSelectedMemberId = (): void => {
  try {
    localStorage.removeItem(MEMBER_PERSISTENCE_KEY);
    console.log('[MemberPersistence] Member ID cleared from local storage');
  } catch (error) {
    console.error('[MemberPersistence] Failed to clear member ID from local storage:', error);
    // Fail silently - local storage might be disabled
  }
};

/**
 * Check if a member ID exists in the provided members array
 * This is useful for validating that a stored member ID is still valid
 * @param memberId - The member ID to validate
 * @param members - Array of available members
 * @returns true if the member ID exists in the members array
 */
export const isValidMemberId = (memberId: string | null, members: Array<{ id: string }>): boolean => {
  if (!memberId || !Array.isArray(members)) {
    return false;
  }

  return members.some(member => member.id === memberId);
};

/**
 * Get the selected member ID if it's valid, otherwise return null
 * This combines retrieval and validation in one function
 * @param members - Array of available members to validate against
 * @returns Valid member ID or null
 */
export const getValidSelectedMemberId = (members: Array<{ id: string }>): string | null => {
  const storedMemberId = getSelectedMemberId();
  
  if (!storedMemberId) {
    return null;
  }

  // Check if the stored member ID still exists in the current members list
  if (isValidMemberId(storedMemberId, members)) {
    return storedMemberId;
  }

  // If stored member ID is no longer valid, clear it
  console.warn('[MemberPersistence] Stored member ID is no longer valid, clearing:', storedMemberId);
  clearSelectedMemberId();
  return null;
};
