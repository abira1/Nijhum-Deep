import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMeals } from '../context/MealContext';
import { useMembers } from '../context/MemberContext';
import RetroWindow from './ui/RetroWindow';
import RetroButton from './ui/RetroButton';
import { ShieldIcon, CalendarIcon, EditIcon, CheckIcon, XIcon, LoaderIcon } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const { isAdmin } = useAuth();
  const { members } = useMembers();
  const { meals, toggleMeal, getMealStatus } = useMeals();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [updatingMeals, setUpdatingMeals] = useState<Set<string>>(new Set());

  if (!isAdmin) {
    return null; // Don't render anything if not admin
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleAdminMealToggle = async (memberId: string, type: 'lunch' | 'dinner') => {
    const mealKey = `${memberId}-${selectedDate}-${type}`;
    setUpdatingMeals(prev => new Set(prev).add(mealKey));
    
    try {
      await toggleMeal(memberId, selectedDate, type, true); // Force admin privileges
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

  const isPastDate = (date: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return date < today;
  };

  const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="w-full mt-8">
      <RetroWindow title="ADMIN PANEL" className="border-yellow-500">
        <div className="bg-yellow-100 border-2 border-yellow-500 p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldIcon className="w-5 h-5 text-yellow-700" />
            <h3 className="text-lg font-bold text-yellow-800">Administrator Access</h3>
          </div>
          <p className="text-yellow-700 text-sm">
            You have administrator privileges. You can edit meal records for any date, including past dates.
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-bold mb-4">Historical Meal Editor</h3>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div className="mb-4 md:mb-0">
              <h4 className="text-lg font-semibold">Edit meals for any date</h4>
              <p className="text-sm text-gray-600">Regular users can only edit today's meals</p>
            </div>
            <div className="flex items-center">
              <CalendarIcon className="mr-2" />
              <input 
                type="date" 
                value={selectedDate} 
                onChange={handleDateChange} 
                className="border-2 border-black p-2 font-mono" 
              />
            </div>
          </div>

          {isPastDate(selectedDate) && (
            <div className="bg-blue-100 border-2 border-blue-500 text-blue-800 px-4 py-3 mb-4 flex items-center">
              <EditIcon className="w-5 h-5 mr-2" />
              <div>
                <strong>Historical Edit Mode:</strong> You are editing past meal records. 
                Regular users cannot modify meals for this date.
              </div>
            </div>
          )}

          <div className="mb-4">
            <h4 className="text-lg font-bold">{formattedDate}</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(member => (
              <div key={member.id} className="border-4 border-black p-4 bg-yellow-50">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  {member.name}
                  <span className="text-xs bg-yellow-200 border border-yellow-600 px-2 py-1 rounded">
                    ADMIN EDIT
                  </span>
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <AdminMealToggleCard 
                    title="LUNCH" 
                    isActive={getMealStatus(member.id, selectedDate, 'lunch')} 
                    onClick={() => handleAdminMealToggle(member.id, 'lunch')}
                    isLoading={updatingMeals.has(`${member.id}-${selectedDate}-lunch`)}
                  />
                  <AdminMealToggleCard 
                    title="DINNER" 
                    isActive={getMealStatus(member.id, selectedDate, 'dinner')} 
                    onClick={() => handleAdminMealToggle(member.id, 'dinner')}
                    isLoading={updatingMeals.has(`${member.id}-${selectedDate}-dinner`)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t-4 border-black pt-6">
          <h3 className="text-xl font-bold mb-4">Admin Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-2 border-black p-4 bg-gray-50">
              <h4 className="font-bold text-lg">Total Members</h4>
              <p className="text-2xl font-bold text-blue-600">{members.length}</p>
            </div>
            <div className="border-2 border-black p-4 bg-gray-50">
              <h4 className="font-bold text-lg">Total Meals</h4>
              <p className="text-2xl font-bold text-green-600">{meals.length}</p>
            </div>
            <div className="border-2 border-black p-4 bg-gray-50">
              <h4 className="font-bold text-lg">Selected Date Meals</h4>
              <p className="text-2xl font-bold text-purple-600">
                {meals.filter(meal => meal.date === selectedDate).length}
              </p>
            </div>
          </div>
        </div>
      </RetroWindow>
    </div>
  );
};

interface AdminMealToggleCardProps {
  title: string;
  isActive: boolean;
  onClick: () => void;
  isLoading?: boolean;
}

const AdminMealToggleCard: React.FC<AdminMealToggleCardProps> = ({
  title,
  isActive,
  onClick,
  isLoading = false
}) => {
  return (
    <button 
      onClick={onClick} 
      disabled={isLoading}
      className={`border-2 border-black p-3 flex flex-col items-center justify-center transition-colors duration-200 ${
        isLoading 
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
          : isActive 
            ? 'bg-yellow-500 text-black border-yellow-700' 
            : 'bg-white text-black hover:bg-yellow-100'
      }`}
    >
      <span className="font-bold mb-2">{title}</span>
      {isLoading ? (
        <LoaderIcon className="w-6 h-6 animate-spin" />
      ) : isActive ? (
        <CheckIcon className="w-6 h-6" />
      ) : (
        <XIcon className="w-6 h-6" />
      )}
    </button>
  );
};

export default AdminPanel;
