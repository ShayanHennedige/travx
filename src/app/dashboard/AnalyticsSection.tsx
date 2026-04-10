"use client";

import { useState, useEffect } from "react";
import { Button, Badge } from "@/components/ui";
import { format, subDays } from "date-fns";

interface AnalyticsData {
  countryDistribution: Record<string, number>;
  ageGroupDistribution: Record<string, number>;
  categoryHappiness: {
    airportWelcome: number;
    hotelQuality: number;
    driver: number;
    vehicle: number;
    overallExperience: number;
  };
  overallHappiness: number;
  lowScores: Array<{ category: string; score: number; feedbackId: string }>;
  keywords: Record<string, number>;
  totalFeedback: number;
  driverPerformance: Array<{
    name: string;
    vehicleType: string;
    averageScore: number;
    reviewCount: number;
  }>;
  hotelPerformance: Array<{
    name: string;
    averageScore: number;
    reviewCount: number;
  }>;
  vehiclePerformance: Array<{
    type: string;
    number: string;
    averageScore: number;
    reviewCount: number;
  }>;
}

export function AnalyticsSection() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    date_from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    date_to: format(new Date(), "yyyy-MM-dd"),
    country: "",
    age_group: "",
    tour_id: "",
  });

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.date_from) params.append("date_from", filters.date_from);
      if (filters.date_to) params.append("date_to", filters.date_to);
      if (filters.country) params.append("country", filters.country);
      if (filters.age_group) params.append("age_group", filters.age_group);
      if (filters.tour_id) params.append("tour_id", filters.tour_id);

      const response = await fetch(`/api/analytics/feedback?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [filters]);

  const getHappinessColor = (score: number) => {
    if (score < 50) return "red";
    if (score < 70) return "orange";
    if (score < 90) return "blue";
    return "green";
  };

  const getHappinessLabel = (score: number) => {
    if (score < 50) return "Poor";
    if (score < 70) return "Average";
    if (score < 90) return "Good";
    return "Excellent";
  };

  if (loading) {
    return (
      <div className="card p-12 text-center">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-surface-600">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics || (analytics.totalFeedback === 0 && analytics.driverPerformance.length === 0)) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-surface-900 mb-1">No Feedback Data</h3>
        <p className="text-surface-500">No feedback has been submitted yet for the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1">Country</label>
            <input
              type="text"
              value={filters.country}
              onChange={(e) => setFilters({ ...filters, country: e.target.value })}
              placeholder="Filter by country"
              className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1">Age Group</label>
            <select
              value={filters.age_group}
              onChange={(e) => setFilters({ ...filters, age_group: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
            >
              <option value="">All Ages</option>
              <option value="Under 18">Under 18</option>
              <option value="18-25">18-25</option>
              <option value="26-35">26-35</option>
              <option value="36-45">36-45</option>
              <option value="46-60">46-60</option>
              <option value="60+">60+</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() => setFilters({
                date_from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
                date_to: format(new Date(), "yyyy-MM-dd"),
                country: "",
                age_group: "",
                tour_id: "",
              })}
              className="w-full"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-surface-500">Total Feedback</p>
          </div>
          <p className="text-3xl font-bold text-surface-900">{analytics.totalFeedback}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-surface-500">Overall Happiness</p>
            <Badge variant={getHappinessColor(analytics.overallHappiness)}>
              {getHappinessLabel(analytics.overallHappiness)}
            </Badge>
          </div>
          <p className="text-3xl font-bold text-surface-900">{analytics.overallHappiness}%</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-surface-500">Low Scores (&lt; 60%)</p>
          </div>
          <p className="text-3xl font-bold text-accent-500">{analytics.lowScores.length}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-surface-500">Countries</p>
          </div>
          <p className="text-3xl font-bold text-surface-900">
            {Object.keys(analytics.countryDistribution).length}
          </p>
        </div>
      </div>

      {/* Category Happiness */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Happiness by Category</h3>
        <div className="space-y-4">
          {Object.entries(analytics.categoryHappiness).map(([category, score]) => (
            <div key={category}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-surface-700 capitalize">
                  {category.replace(/([A-Z])/g, " $1").trim()}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-surface-900">{score}%</span>
                  <Badge variant={getHappinessColor(score)}>
                    {getHappinessLabel(score)}
                  </Badge>
                </div>
              </div>
              <div className="w-full bg-surface-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${score < 50 ? "bg-accent-500" :
                    score < 70 ? "bg-orange-500" :
                      score < 90 ? "bg-blue-500" :
                        "bg-green-500"
                    }`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Country Distribution</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {Object.entries(analytics.countryDistribution)
              .sort(([, a], [, b]) => b - a)
              .map(([country, count]) => {
                const percentage = Math.round((count / analytics.totalFeedback) * 100);
                return (
                  <div key={country}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-surface-700">{country}</span>
                      <span className="text-sm text-surface-500">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-surface-200 rounded-full h-2">
                      <div
                        className="h-2 bg-primary-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Age Group Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Age Group Distribution</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {Object.entries(analytics.ageGroupDistribution)
              .sort(([, a], [, b]) => b - a)
              .map(([ageGroup, count]) => {
                const percentage = Math.round((count / analytics.totalFeedback) * 100);
                return (
                  <div key={ageGroup}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-surface-700">{ageGroup}</span>
                      <span className="text-sm text-surface-500">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-surface-200 rounded-full h-2">
                      <div
                        className="h-2 bg-purple-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Detailed Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Driver Performance */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Top Drivers</h3>
          <div className="overflow-y-auto max-h-80">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface-50 text-surface-500 font-medium">
                <tr>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2 text-center">Score</th>
                  <th className="px-2 py-2 text-right">Trips</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {analytics.driverPerformance.map((driver, i) => (
                  <tr key={i} className="hover:bg-surface-50">
                    <td className="px-2 py-3">
                      <div className="font-medium text-surface-900">{driver.name}</div>
                      <div className="text-xs text-surface-500">{driver.vehicleType}</div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <Badge variant={getHappinessColor(driver.averageScore)}>
                        {driver.averageScore}%
                      </Badge>
                    </td>
                    <td className="px-2 py-3 text-right text-surface-600">{driver.reviewCount}</td>
                  </tr>
                ))}
                {analytics.driverPerformance.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-2 py-4 text-center text-surface-500">No driver data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hotel Performance */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Top Hotels</h3>
          <div className="overflow-y-auto max-h-80">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface-50 text-surface-500 font-medium">
                <tr>
                  <th className="px-2 py-2">Hotel</th>
                  <th className="px-2 py-2 text-center">Score</th>
                  <th className="px-2 py-2 text-right">Reviews</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {analytics.hotelPerformance.map((hotel, i) => (
                  <tr key={i} className="hover:bg-surface-50">
                    <td className="px-2 py-3 font-medium text-surface-900">{hotel.name}</td>
                    <td className="px-2 py-3 text-center">
                      <Badge variant={getHappinessColor(hotel.averageScore)}>
                        {hotel.averageScore}%
                      </Badge>
                    </td>
                    <td className="px-2 py-3 text-right text-surface-600">{hotel.reviewCount}</td>
                  </tr>
                ))}
                {analytics.hotelPerformance.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-2 py-4 text-center text-surface-500">No hotel data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vehicle Performance */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Top Vehicles</h3>
          <div className="overflow-y-auto max-h-80">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface-50 text-surface-500 font-medium">
                <tr>
                  <th className="px-2 py-2">Vehicle</th>
                  <th className="px-2 py-2 text-center">Score</th>
                  <th className="px-2 py-2 text-right">Trips</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {analytics.vehiclePerformance.map((vehicle, i) => (
                  <tr key={i} className="hover:bg-surface-50">
                    <td className="px-2 py-3">
                      <div className="font-medium text-surface-900">{vehicle.type}</div>
                      <div className="text-xs text-surface-500">{vehicle.number}</div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <Badge variant={getHappinessColor(vehicle.averageScore)}>
                        {vehicle.averageScore}%
                      </Badge>
                    </td>
                    <td className="px-2 py-3 text-right text-surface-600">{vehicle.reviewCount}</td>
                  </tr>
                ))}
                {analytics.vehiclePerformance.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-2 py-4 text-center text-surface-500">No vehicle data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Low Scores Alert */}
      {analytics.lowScores.length > 0 && (
        <div className="card p-6 border-l-4 border-accent-500">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-semibold text-surface-900">Low Scores Alert (&lt; 60%)</h3>
          </div>
          <div className="space-y-2">
            {analytics.lowScores.slice(0, 10).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-accent-500/10 rounded">
                <span className="text-sm font-medium text-surface-700">{item.category}</span>
                <span className="text-sm font-bold text-accent-500">{item.score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      {Object.keys(analytics.keywords).length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Common Keywords from Remarks</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(analytics.keywords)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 20)
              .map(([word, count]) => (
                <span
                  key={word}
                  className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                >
                  {word} ({count})
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
