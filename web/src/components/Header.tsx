import React from 'react';
import { Ambulance } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Ambulance className="h-8 w-8 text-indigo-600 mr-2" />
          <h1 className="text-xl font-bold text-slate-800">Ambulance Route Tracker</h1>
        </div>
        
        <nav className="hidden md:block">
          <ul className="flex space-x-6">
            <li>
              <a href="#" className="text-slate-600 hover:text-indigo-600 transition-colors">
                Dashboard
              </a>
            </li>
            <li>
              <a href="#" className="text-slate-600 hover:text-indigo-600 transition-colors">
                Routes
              </a>
            </li>
            <li>
              <a href="#" className="text-slate-600 hover:text-indigo-600 transition-colors">
                Analytics
              </a>
            </li>
            <li>
              <a href="#" className="text-slate-600 hover:text-indigo-600 transition-colors">
                Settings
              </a>
            </li>
          </ul>
        </nav>
        
        <div className="flex items-center">
          <button 
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm"
          >
            Emergency
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;