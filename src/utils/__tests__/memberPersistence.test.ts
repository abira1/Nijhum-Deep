/**
 * Tests for member persistence utility functions
 * These tests verify that local storage operations work correctly
 */

import { 
  saveSelectedMemberId, 
  getSelectedMemberId, 
  clearSelectedMemberId, 
  isValidMemberId, 
  getValidSelectedMemberId 
} from '../memberPersistence';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  localStorageMock.clear();
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('memberPersistence', () => {
  const testMemberId = 'test-member-123';
  const testMembers = [
    { id: 'member-1', name: 'John' },
    { id: 'member-2', name: 'Jane' },
    { id: testMemberId, name: 'Test Member' }
  ];

  describe('saveSelectedMemberId', () => {
    it('should save valid member ID to localStorage', () => {
      saveSelectedMemberId(testMemberId);
      expect(localStorageMock.getItem('nijhum_dip_selected_member_id')).toBe(testMemberId);
    });

    it('should not save invalid member ID', () => {
      saveSelectedMemberId('');
      expect(localStorageMock.getItem('nijhum_dip_selected_member_id')).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = jest.fn(() => {
        throw new Error('localStorage error');
      });

      expect(() => saveSelectedMemberId(testMemberId)).not.toThrow();
      
      localStorageMock.setItem = originalSetItem;
    });
  });

  describe('getSelectedMemberId', () => {
    it('should retrieve saved member ID', () => {
      localStorageMock.setItem('nijhum_dip_selected_member_id', testMemberId);
      expect(getSelectedMemberId()).toBe(testMemberId);
    });

    it('should return null when no member ID is stored', () => {
      expect(getSelectedMemberId()).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = jest.fn(() => {
        throw new Error('localStorage error');
      });

      expect(getSelectedMemberId()).toBeNull();
      
      localStorageMock.getItem = originalGetItem;
    });
  });

  describe('clearSelectedMemberId', () => {
    it('should clear stored member ID', () => {
      localStorageMock.setItem('nijhum_dip_selected_member_id', testMemberId);
      clearSelectedMemberId();
      expect(localStorageMock.getItem('nijhum_dip_selected_member_id')).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      const originalRemoveItem = localStorageMock.removeItem;
      localStorageMock.removeItem = jest.fn(() => {
        throw new Error('localStorage error');
      });

      expect(() => clearSelectedMemberId()).not.toThrow();
      
      localStorageMock.removeItem = originalRemoveItem;
    });
  });

  describe('isValidMemberId', () => {
    it('should return true for valid member ID', () => {
      expect(isValidMemberId(testMemberId, testMembers)).toBe(true);
    });

    it('should return false for invalid member ID', () => {
      expect(isValidMemberId('invalid-id', testMembers)).toBe(false);
    });

    it('should return false for null member ID', () => {
      expect(isValidMemberId(null, testMembers)).toBe(false);
    });

    it('should return false for empty members array', () => {
      expect(isValidMemberId(testMemberId, [])).toBe(false);
    });
  });

  describe('getValidSelectedMemberId', () => {
    it('should return valid stored member ID', () => {
      localStorageMock.setItem('nijhum_dip_selected_member_id', testMemberId);
      expect(getValidSelectedMemberId(testMembers)).toBe(testMemberId);
    });

    it('should return null and clear invalid stored member ID', () => {
      localStorageMock.setItem('nijhum_dip_selected_member_id', 'invalid-id');
      expect(getValidSelectedMemberId(testMembers)).toBeNull();
      expect(localStorageMock.getItem('nijhum_dip_selected_member_id')).toBeNull();
    });

    it('should return null when no member ID is stored', () => {
      expect(getValidSelectedMemberId(testMembers)).toBeNull();
    });
  });
});
