import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { UtensilsIcon, ShoppingCartIcon, CalculatorIcon, SettingsIcon } from 'lucide-react';
import PWAStatus from './PWAStatus';
const Layout = () => {
  const location = useLocation();
  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-200';
  };
  return <div className="min-h-screen bg-gray-100 font-mono text-black">
      <header className="bg-white border-b-4 border-black p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/meal" className="flex items-center">
            <img src="https://i.postimg.cc/C16GZhpN/90719560792.png" alt="Nijhum Dip Logo" className="w-12 h-12 mr-2" />
            <h1 className="text-2xl font-bold tracking-tighter hidden md:block">
              NIJHUM DIP
            </h1>
          </Link>
          <nav className="flex gap-1 md:gap-2">
            <Link to="/meal" className={`${isActive('/meal')} px-2 md:px-4 py-2 border-2 border-black font-bold transition-colors duration-200 flex items-center`}>
              <UtensilsIcon className="w-4 h-4 md:mr-1" />
              <span className="hidden md:inline">Meal</span>
            </Link>
            <Link to="/bazar" className={`${isActive('/bazar')} px-2 md:px-4 py-2 border-2 border-black font-bold transition-colors duration-200 flex items-center`}>
              <ShoppingCartIcon className="w-4 h-4 md:mr-1" />
              <span className="hidden md:inline">Bazar</span>
            </Link>
            <Link to="/calculate" className={`${isActive('/calculate')} px-2 md:px-4 py-2 border-2 border-black font-bold transition-colors duration-200 flex items-center`}>
              <CalculatorIcon className="w-4 h-4 md:mr-1" />
              <span className="hidden md:inline">Calculate</span>
            </Link>
            <Link to="/settings" className={`${isActive('/settings')} px-2 md:px-4 py-2 border-2 border-black font-bold transition-colors duration-200 flex items-center`}>
              <SettingsIcon className="w-4 h-4 md:mr-1" />
              <span className="hidden md:inline">Settings</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* PWA Status Bar */}
      <PWAStatus className="container mx-auto" />

      <main className="container mx-auto p-4">
        <Outlet />
      </main>
      <footer className="bg-white border-t-4 border-black p-4 text-center mt-8">
        <p className="font-bold">© 2025 NIJHUM DIP - BACHELOR MEAL MANAGER</p>
        <p className="mt-2">
          <a href="https://toiral-development.web.app/" target="_blank" rel="noopener noreferrer" className="text-black hover:underline font-medium">
            Made By Toiral Web Development
          </a>
        </p>
      </footer>
    </div>;
};
export default Layout;