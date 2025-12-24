import React from 'react';
import { useAuth } from '../context/AuthContext';
import RetroWindow from './ui/RetroWindow';
import GoogleLogin from './ui/GoogleLogin';
import { LoaderIcon, UserIcon, DatabaseIcon, RefreshCwIcon, ShieldIcon } from 'lucide-react';

const AuthScreen: React.FC = () => {
  const { loading, error } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <RetroWindow title="NIJHUM DIP" className="max-w-md w-full">
          <div className="flex flex-col items-center justify-center py-8">
            <LoaderIcon className="w-8 h-8 animate-spin mb-4" />
            <p className="text-lg font-mono">Initializing...</p>
          </div>
        </RetroWindow>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Main Welcome Window */}
        <RetroWindow title="WELCOME TO NIJHUM DIP" className="text-center">
          <div className="space-y-6">
            {/* Hero Section */}
            <div className="border-4 border-black p-6 bg-blue-50">
              <h1 className="text-3xl font-bold mb-4">🏝️ Nijhum Dip</h1>
              <p className="text-lg mb-4">
                Your Digital Meal & Expense Tracker
              </p>
              <p className="text-gray-700">
                Track daily meals, manage market expenses, and calculate monthly costs 
                with real-time synchronization across all your devices.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 border-black p-4 bg-green-50">
                <div className="flex items-center mb-2">
                  <UserIcon className="w-5 h-5 mr-2" />
                  <h3 className="font-bold">Meal Tracking</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Track lunch and dinner for all members with daily meal status updates.
                </p>
              </div>

              <div className="border-2 border-black p-4 bg-yellow-50">
                <div className="flex items-center mb-2">
                  <DatabaseIcon className="w-5 h-5 mr-2" />
                  <h3 className="font-bold">Expense Management</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Record market expenses and automatically calculate monthly totals.
                </p>
              </div>

              <div className="border-2 border-black p-4 bg-purple-50">
                <div className="flex items-center mb-2">
                  <RefreshCwIcon className="w-5 h-5 mr-2" />
                  <h3 className="font-bold">Real-time Sync</h3>
                </div>
                <p className="text-sm text-gray-600">
                  All changes sync instantly across devices with Firebase integration.
                </p>
              </div>

              <div className="border-2 border-black p-4 bg-orange-50">
                <div className="flex items-center mb-2">
                  <ShieldIcon className="w-5 h-5 mr-2" />
                  <h3 className="font-bold">Secure Access</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Google authentication ensures your data is secure and accessible.
                </p>
              </div>
            </div>

            {/* Authentication Section */}
            <div className="border-4 border-black p-6 bg-gray-50">
              <h2 className="text-xl font-bold mb-4">Get Started</h2>
              <p className="mb-6 text-gray-700">
                Sign in with your Google account to access all features and sync your data across devices.
              </p>
              
              {error && (
                <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 mb-4">
                  <strong>Authentication Error:</strong> {error}
                </div>
              )}
              
              <GoogleLogin />
            </div>

            {/* Benefits Section */}
            <div className="border-2 border-gray-400 p-4 bg-gray-50">
              <h3 className="font-bold mb-3">Why Sign In?</h3>
              <ul className="text-sm text-gray-600 space-y-2 text-left">
                <li className="flex items-start">
                  <span className="font-mono mr-2">•</span>
                  <span>Access your meal and expense data from any device</span>
                </li>
                <li className="flex items-start">
                  <span className="font-mono mr-2">•</span>
                  <span>Real-time synchronization with other users</span>
                </li>
                <li className="flex items-start">
                  <span className="font-mono mr-2">•</span>
                  <span>Secure cloud storage with automatic backups</span>
                </li>
                <li className="flex items-start">
                  <span className="font-mono mr-2">•</span>
                  <span>Collaborative meal planning and expense tracking</span>
                </li>
              </ul>
            </div>
          </div>
        </RetroWindow>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Powered by Firebase • Built with React & TypeScript</p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
