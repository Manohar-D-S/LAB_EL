// 


import React from 'react';
import { Ambulance, Navigation, Signal, Clock, AlertCircle } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-white to-blue-50 backdrop-blur-sm border-b border-gray-200/50 shadow-md z-20 relative">
      <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Ambulance className="h-6 w-6 text-white" />
          </div>
          
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Smart Traffic Control</h1>
            <div className="flex items-center text-sm text-gray-500 mt-0.5">
              <Signal className="h-4 w-4 mr-1" />
              <span>Emergency Response System</span>
            </div>
          </div>
        </div>
        
        <div className="ml-auto flex flex-wrap gap-2 mt-3 md:mt-0">
          <div className="bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-100">
            <div className="flex items-center text-xs font-medium text-blue-700">
              <Navigation className="h-3.5 w-3.5 mr-1" />
              <span>Route Optimization</span>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg px-3 py-1.5 border border-green-100">
            <div className="flex items-center text-xs font-medium text-green-700">
              <Clock className="h-3.5 w-3.5 mr-1" />
              <span>Real-time Simulation</span>
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg px-3 py-1.5 border border-red-100">
            <div className="flex items-center text-xs font-medium text-red-700">
              <AlertCircle className="h-3.5 w-3.5 mr-1" />
              <span>Emergency Clearance</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;