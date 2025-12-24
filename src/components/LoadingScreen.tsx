import React, { useEffect, useState } from 'react';
const LoadingScreen = ({
  onLoadingComplete
}) => {
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      onLoadingComplete();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onLoadingComplete]);
  return isLoading ? <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="flex flex-col items-center">
        <img src="https://i.postimg.cc/C16GZhpN/90719560792.png" alt="Nijhum Dip Logo" className="w-64 h-64 object-contain animate-pulse" />
        <div className="mt-6 font-mono text-white text-lg">
          <div className="flex items-center">
            <div className="h-2 w-2 bg-white mr-2 animate-blink"></div>
            Loading system...
          </div>
        </div>
      </div>
    </div> : null;
};
export default LoadingScreen;