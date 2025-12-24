import React, { useState } from 'react';
import RetroWindow from './ui/RetroWindow';
import { LockIcon, AlertCircleIcon } from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const CORRECT_PASSWORD = 'Xsw#tyah34';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === CORRECT_PASSWORD) {
      // Correct password - unlock the database
      setError(false);
      localStorage.setItem('nijhum_dip_unlocked', 'true');
      onUnlock();
    } else {
      // Wrong password - show error
      setError(true);
      setIsShaking(true);
      setPassword('');
      
      // Remove shake animation after 500ms
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className={`max-w-md w-full ${isShaking ? 'animate-shake' : ''}`}>
        <RetroWindow title="NIJHUM DIP - DATABASE LOCKED">
          <div className="flex flex-col items-center space-y-6 py-8">
            {/* Lock Icon */}
            <div className="border-4 border-black p-6 bg-yellow-50">
              <LockIcon className="w-16 h-16" strokeWidth={2.5} />
            </div>

            {/* Messages */}
            <div className="text-center space-y-4 w-full">
              <h2 className="text-2xl font-bold border-b-4 border-black pb-2">
                This Project Database is Locked
              </h2>
              
              <p className="text-lg text-gray-700 font-mono">
                Please contact developer to unlock Nijhum Dip
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-100 border-4 border-red-500 text-red-700 px-4 py-3 w-full flex items-center">
                <AlertCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="font-bold">Incorrect password. Please try again.</span>
              </div>
            )}

            {/* Password Form */}
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <div className="border-4 border-black p-1 bg-white">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  placeholder="Enter Password..."
                  className="w-full px-4 py-3 font-mono text-lg focus:outline-none"
                  autoFocus
                  data-testid="lock-screen-password-input"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white font-bold py-4 px-6 border-4 border-black hover:bg-gray-800 active:bg-gray-900 transition-colors text-lg"
                data-testid="lock-screen-unlock-button"
              >
                Unlock Database
              </button>
            </form>

            {/* Footer Note */}
            <div className="border-2 border-gray-400 p-3 bg-gray-50 w-full">
              <p className="text-sm text-gray-600 text-center font-mono">
                🔒 This database is password protected
              </p>
            </div>
          </div>
        </RetroWindow>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  );
};

export default LockScreen;
