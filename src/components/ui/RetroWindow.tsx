import React from 'react';
interface RetroWindowProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}
const RetroWindow = ({
  title,
  children,
  className = ''
}: RetroWindowProps) => {
  return <div className={`bg-white border-4 border-black mb-6 ${className}`}>
      <div className="bg-black text-white p-2 font-bold flex justify-between items-center">
        <div className="flex items-center">
          <img src="https://i.postimg.cc/C16GZhpN/90719560792.png" alt="Nijhum Dip Logo" className="w-6 h-6 mr-2" />
          {title}
        </div>
        <div className="flex space-x-2">
          <div className="w-3 h-3 border border-white"></div>
          <div className="w-3 h-3 border border-white"></div>
          <div className="w-3 h-3 border border-white"></div>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>;
};
export default RetroWindow;