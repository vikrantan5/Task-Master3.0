import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { Calendar, TrendingUp, Target, Clock, Filter, ChevronDown } from 'lucide-react';
import { useAnalytics, AnalyticsFilters } from '../../hooks/useAnalytics';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const AnalyticsDashboard: React.FC = () => {
  const { analytics, loading, fetchAnalytics, generateDailyAnalytics, getDefaultFilters } = useAnalytics();
  const [filters, setFilters] = useState<AnalyticsFilters>(getDefaultFilters('week'));
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    generateDailyAnalytics();
    fetchAnalytics(filters);
  }, [filters]);

  const handlePeriodChange = (period: 'day' | 'week' | 'month') => {
    const newFilters = getDefaultFilters(period);
    setFilters(newFilters);
  };

  const handleCustomDateRange = (startDate: string, endDate: string) => {
    setFilters({
      ...filters,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  };

  // Calculate summary statistics
  const totalTasks = analytics.reduce((sum, day) => sum + day.totalTasks, 0);
  const totalCompleted = analytics.reduce((sum, day) => sum + day.completedTasks, 0);
  const averageCompletionRate = analytics.length > 0 
    ? analytics.reduce((sum, day) => sum + day.completionRate, 0) / analytics.length 
    : 0;
  const averageProductivityScore = analytics.length > 0
    ? analytics.reduce((sum, day) => sum + day.productivityScore, 0) / analytics.length
    : 0;

  // Prepare chart data
  const chartData = analytics.map(day => ({
    date: format(new Date(day.date), 'MMM dd'),
    fullDate: day.date,
    totalTasks: day.totalTasks,
    completedTasks: day.completedTasks,
    completionRate: day.completionRate,
    notesCreated: day.notesCreated,
    productivityScore: day.productivityScore,
  }));

  // Productivity trend data
  const trendData = analytics.map(day => ({
    date: format(new Date(day.date), 'MMM dd'),
    score: day.productivityScore,
  }));

  // Task completion pie chart data
  const pieData = [
    { name: 'Completed', value: totalCompleted, color: '#10B981' },
    { name: 'Incomplete', value: totalTasks - totalCompleted, color: '#EF4444' },
  ];

  const COLORS = ['#10B981', '#EF4444'];

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-white shadow-sm border-b border-gray-200 p-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-0">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Analytics Dashboard</h2>
            <p className="text-gray-600">Track your productivity and progress</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Analytics Dashboard</h2>
              <p className="text-gray-600">Track your productivity and progress</p>
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => handlePeriodChange('day')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filters.period === 'day'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => handlePeriodChange('week')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filters.period === 'week'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  3 Weeks
                </button>
                <button
                  onClick={() => handlePeriodChange('month')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filters.period === 'month'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  3 Months
                </button>
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Filter size={16} />
                Custom Range
                <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Custom Date Range */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={format(filters.startDate, 'yyyy-MM-dd')}
                    onChange={(e) => handleCustomDateRange(e.target.value, format(filters.endDate, 'yyyy-MM-dd'))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={format(filters.endDate, 'yyyy-MM-dd')}
                    onChange={(e) => handleCustomDateRange(format(filters.startDate, 'yyyy-MM-dd'), e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-0 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                  <p className="text-3xl font-bold text-gray-900">{totalTasks}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{totalCompleted}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-3xl font-bold text-blue-600">{averageCompletionRate.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Productivity Score</p>
                  <p className="text-3xl font-bold text-purple-600">{averageProductivityScore.toFixed(1)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Task Completion Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Task Completion</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Bar dataKey="totalTasks" fill="#e5e7eb" name="Total Tasks" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completedTasks" fill="#10B981" name="Completed Tasks" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Productivity Trend */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Productivity Trend</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#8B5CF6" 
                      fill="#8B5CF6" 
                      fillOpacity={0.3}
                      strokeWidth={3}
                      name="Productivity Score"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Completion Rate Over Time */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Completion Rate Trend</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Completion Rate']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completionRate" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Task Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Task Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Analytics Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Total Tasks</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Completed</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Completion Rate</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Notes Created</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Productivity Score</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.map((day, index) => (
                    <tr key={day.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {format(new Date(day.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{day.totalTasks}</td>
                      <td className="py-3 px-4 text-green-600 font-medium">{day.completedTasks}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${day.completionRate}%` }}
                            />
                          </div>
                          <span className="text-gray-700 font-medium">{day.completionRate.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{day.notesCreated}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          day.productivityScore >= 80 
                            ? 'bg-green-100 text-green-800'
                            : day.productivityScore >= 60
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {day.productivityScore.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {analytics.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <TrendingUp size={64} className="mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">No analytics data yet</h3>
                <p className="text-gray-500">Complete some tasks to see your productivity analytics!</p>
              </div>
            )}
          </div>

          {/* Insights Panel */}
          {analytics.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Insights & Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <h4 className="font-medium text-blue-800 mb-2">Best Performance Day</h4>
                  <p className="text-sm text-blue-700">
                    {analytics.length > 0 && (() => {
                      const bestDay = analytics.reduce((best, current) => 
                        current.productivityScore > best.productivityScore ? current : best
                      );
                      return `${format(new Date(bestDay.date), 'MMM dd')} with ${bestDay.productivityScore.toFixed(1)} score`;
                    })()}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <h4 className="font-medium text-purple-800 mb-2">Average Daily Tasks</h4>
                  <p className="text-sm text-purple-700">
                    {analytics.length > 0 ? (totalTasks / analytics.length).toFixed(1) : '0'} tasks per day
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;