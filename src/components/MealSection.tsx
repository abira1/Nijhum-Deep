import React, { useState, useEffect } from 'react';
import { useMembers } from '../context/MemberContext';
import { useMeals } from '../context/MealContext';
import { useAuth } from '../context/AuthContext';
import RetroWindow from './ui/RetroWindow';
import AdminPanel from './AdminPanel';
import { CalendarIcon, CheckIcon, XIcon, LoaderIcon, ShieldIcon, AlertTriangleIcon, ClockIcon, HistoryIcon } from 'lucide-react';
const MealSection = () => {
  const {
    members
  } = useMembers();
  const {
    toggleMeal,
    getMealStatus,
    loading,
    error,
    canEditMeal,
    currentDate,
    isToday,
    isPastDate,
    isFutureDate,
    getRelativeDateDescription,
    formatDateForDisplay,
    isNearMidnight,
    timeUntilMidnight,
    refreshCurrentDate
  } = useMeals();
  const { isAuthenticated, isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [updatingMeals, setUpdatingMeals] = useState<Set<string>>(new Set());

  // Update selected date when current date changes (day transition)
  useEffect(() => {
    if (isToday(selectedDate)) {
      setSelectedDate(currentDate);
    }
  }, [currentDate, selectedDate, isToday]);

  const formattedDate = formatDateForDisplay(selectedDate);
  const relativeDateDescription = getRelativeDateDescription(selectedDate);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleMealToggle = async (memberId: string, type: 'lunch' | 'dinner') => {
    if (!isAuthenticated) {
      alert('Please sign in to manage meals.');
      return;
    }

    const mealKey = `${memberId}-${selectedDate}-${type}`;
    setUpdatingMeals(prev => new Set(prev).add(mealKey));

    try {
      await toggleMeal(memberId, selectedDate, type, isAdmin);
    } catch (error) {
      console.error('Failed to toggle meal:', error);
      alert(error instanceof Error ? error.message : 'Failed to update meal. Please try again.');
    } finally {
      setUpdatingMeals(prev => {
        const newSet = new Set(prev);
        newSet.delete(mealKey);
        return newSet;
      });
    }
  };

  // Helper function for checking if user can edit a specific date
  const canUserEditDate = (date: string): boolean => {
    return isAdmin || isToday(date);
  };

  // Get status indicator for the selected date
  const getDateStatusIndicator = () => {
    if (isToday(selectedDate)) {
      return {
        icon: <ClockIcon className="w-4 h-4" />,
        text: 'Today',
        className: 'bg-green-200 border-green-600 text-green-800'
      };
    } else if (isPastDate(selectedDate)) {
      return {
        icon: <HistoryIcon className="w-4 h-4" />,
        text: 'Historical',
        className: 'bg-blue-200 border-blue-600 text-blue-800'
      };
    } else {
      return {
        icon: <CalendarIcon className="w-4 h-4" />,
        text: 'Future',
        className: 'bg-yellow-200 border-yellow-600 text-yellow-800'
      };
    }
  };

  const dateStatus = getDateStatusIndicator();
  if (loading) {
    return <div className="w-full">
        <RetroWindow title="MEAL TRACKER" className="mb-8">
          <div className="flex items-center justify-center py-8">
            <LoaderIcon className="animate-spin mr-2" />
            <span className="text-lg">Loading meals...</span>
          </div>
        </RetroWindow>
      </div>;
  }

  // Don't show connection errors if user is not authenticated
  if (!isAuthenticated) {
    return <div className="w-full">
        <RetroWindow title="MEAL TRACKER" className="mb-8">
          <div className="flex items-center justify-center py-8">
            <span className="text-lg">Please sign in to access meal tracking.</span>
          </div>
        </RetroWindow>
      </div>;
  }

  return <div className="w-full">
      <RetroWindow title="MEAL TRACKER" className="mb-8">
        {error && <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 mb-4">
            <strong>Error:</strong> {error}
          </div>}

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Daily Meal Status</h2>
            {isAdmin && (
              <div className="flex items-center bg-yellow-200 border-2 border-yellow-600 px-2 py-1 text-xs font-bold">
                <ShieldIcon className="w-3 h-3 mr-1" />
                ADMIN
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <CalendarIcon className="mr-2" />
            <input type="date" value={selectedDate} onChange={handleDateChange} className="border-2 border-black p-2 font-mono" />
            <button
              onClick={refreshCurrentDate}
              className="border-2 border-black p-2 hover:bg-gray-100 transition-colors"
              title="Refresh current date"
            >
              <LoaderIcon className="w-4 h-4" />
            </button>
          </div>
        </div>



        {/* Date Status and Near Midnight Warning */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">{relativeDateDescription}</h3>
            <div className={`flex items-center gap-1 px-2 py-1 border-2 text-xs font-bold ${dateStatus.className}`}>
              {dateStatus.icon}
              {dateStatus.text}
            </div>
          </div>

          {/* Near midnight warning */}
          {isToday(selectedDate) && isNearMidnight(10) && (
            <div className="bg-orange-100 border-2 border-orange-500 text-orange-700 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="w-4 h-4" />
                <span className="font-bold">Near Midnight:</span>
                <span>Day will transition in {Math.ceil(timeUntilMidnight / (1000 * 60))} minutes. Current meals will be finalized automatically.</span>
              </div>
            </div>
          )}


        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(member => <div key={member.id} className="border-4 border-black p-4">
              <h3 className="text-xl font-bold mb-4">{member.name}</h3>
              <div className="grid grid-cols-2 gap-4">
                <MealToggleCard
                  title="LUNCH"
                  isActive={getMealStatus(member.id, selectedDate, 'lunch')}
                  onClick={() => handleMealToggle(member.id, 'lunch')}
                  isLoading={updatingMeals.has(`${member.id}-${selectedDate}-lunch`)}
                  disabled={!isAuthenticated || !canUserEditDate(selectedDate)}
                />
                <MealToggleCard
                  title="DINNER"
                  isActive={getMealStatus(member.id, selectedDate, 'dinner')}
                  onClick={() => handleMealToggle(member.id, 'dinner')}
                  isLoading={updatingMeals.has(`${member.id}-${selectedDate}-dinner`)}
                  disabled={!isAuthenticated || !canUserEditDate(selectedDate)}
                />
              </div>
            </div>)}
        </div>
      </RetroWindow>

      {/* Admin Panel - only visible to admin users */}
      <AdminPanel />
    </div>;
};
interface MealToggleCardProps {
  title: string;
  isActive: boolean;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}
const MealToggleCard = ({
  title,
  isActive,
  onClick,
  isLoading = false,
  disabled = false
}: MealToggleCardProps) => {
  return <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`border-2 border-black p-3 flex flex-col items-center justify-center transition-colors duration-200 ${
        isLoading || disabled
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
          : isActive
            ? 'bg-black text-white'
            : 'bg-white text-black hover:bg-gray-100'
      }`}
    >
      <span className="font-bold mb-2">{title}</span>
      {isLoading ? (
        <LoaderIcon className="w-6 h-6 animate-spin" />
      ) : isActive ? (
        <CheckIcon className={`w-6 h-6 ${disabled ? 'opacity-50' : ''}`} />
      ) : (
        <XIcon className={`w-6 h-6 ${disabled ? 'opacity-50' : ''}`} />
      )}
    </button>;
};
export default MealSection;