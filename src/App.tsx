import React, { useState } from 'react';
import { CheckSquare, FileText, User, BarChart3, Users } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import ProfilePage from './components/Profile/ProfilePage';
import TodoApp from './components/TodoApp';
import NotesApp from './components/NotesApp';
import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard';
import SocialPage from './components/Social/SocialPage';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'todos' | 'notes' | 'analytics' | 'social' | 'profile'>('todos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading TaskMaster...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={`fixed lg:relative lg:translate-x-0 w-64 bg-white shadow-xl border-r border-gray-200 z-30 h-full transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-800">TaskMaster</h1>
            <p className="text-sm text-gray-500 mt-1">Organize your life</p>
          </div>
          
          <nav className="p-4">
            <button
              onClick={() => setActiveTab('todos')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 mb-2 ${
                activeTab === 'todos'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <CheckSquare size={20} />
              <span className="font-medium">Todo Tasks</span>
            </button>
            
            <button
              onClick={() => setActiveTab('notes')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === 'notes'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <FileText size={20} />
              <span className="font-medium">Notes & Reminders</span>
            </button>
            
            <button
              onClick={() => setActiveTab('social')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 mb-2 ${
                activeTab === 'social'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <Users size={20} />
              <span className="font-medium">Social Hub</span>
            </button>
            
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 mb-2 ${
                activeTab === 'analytics'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <BarChart3 size={20} />
              <span className="font-medium">Analytics</span>
            </button>
            
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === 'profile'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <User size={20} />
              <span className="font-medium">Profile</span>
            </button>
          </nav>
        </div>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden lg:ml-0">
          {/* Mobile header */}
          <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-800">TaskMaster</h1>
            <div className="w-10" /> {/* Spacer */}
          </div>
          
          {activeTab === 'todos' && <TodoApp />}
          {activeTab === 'notes' && <NotesApp />}
          {activeTab === 'social' && <SocialPage />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'profile' && <ProfilePage />}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;