import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Utility Functions ---

/**
 * Formats a number as a currency string (Indian Rupees in this case).
 * @param {number} value - The number to format.
 * @returns {string} The formatted currency string.
 */
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0, // No decimal places for simplicity
    maximumFractionDigits: 0,
  }).format(value);
};

// --- Shadcn/ui Card Component Mockups (for self-contained code) ---
// In a real shadcn/ui setup, you would import these:
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Simple mock for Card component using Tailwind CSS
const Card = ({ className = '', children }) => (
  <div className={`bg-gray-800 text-white rounded-xl shadow-lg p-6 ${className}`}>
    {children}
  </div>
);

// Simple mock for CardHeader component using Tailwind CSS
const CardHeader = ({ className = '', children }) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
);

// Simple mock for CardTitle component using Tailwind CSS
const CardTitle = ({ className = '', children }) => (
  <h2 className={`text-2xl font-bold ${className}`}>
    {children}
  </h2>
);

// Simple mock for CardContent component using Tailwind CSS
const CardContent = ({ className = '', children }) => (
  <div className={`${className}`}>
    {children}
  </div>
);

// --- SalesTrendChart Component ---

/**
 * @typedef {object} SalesTrendData
 * @property {string} date - The date string (e.g., "YYYY-MM-DD").
 * @property {number} sales - The sales amount for the date.
 * @property {number} profit - The profit amount for the date.
 */

/**
 * @typedef {object} SalesTrendChartProps
 * @property {SalesTrendData[]} [data=[]] - An array of sales and profit data.
 */

/**
 * SalesTrendChart component displays a line chart for sales and profit trends.
 * @param {SalesTrendChartProps} props - The component props.
 * @returns {JSX.Element} The SalesTrendChart component.
 */
function SalesTrendChart({ data = [] }) {
  // Formats date strings for display on the X-axis and tooltip.
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className="futuristic-card">
      <CardHeader>
        {/* The 'glow-text' class needs to be defined in your global CSS or Tailwind config */}
        <CardTitle className="text-cyan-300 glow-text">Sales & Profit Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            {/* Grid lines for the chart background */}
            <CartesianGrid strokeDasharray="3 3" stroke="#1e40af" />
            {/* X-axis for dates */}
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: '#60a5fa' }} // Color for axis ticks
            />
            {/* Y-axis for sales/profit values */}
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fill: '#60a5fa' }} // Color for axis ticks
            />
            {/* Tooltip that appears on hover */}
            <Tooltip
              labelFormatter={(value) => formatDate(value)}
              formatter={(value, name) => [
                formatCurrency(value),
                name === 'sales' ? 'Sales' : 'Profit'
              ]}
              contentStyle={{
                backgroundColor: '#1e293b', // Dark background for tooltip
                border: '1px solid #0ea5e9', // Blue border
                borderRadius: '8px',
                color: '#e2e8f0' // Light text color
              }}
            />
            {/* Legend to identify lines */}
            <Legend
              wrapperStyle={{ color: '#60a5fa', paddingTop: '10px' }} // Color for legend text
            />
            {/* Line for Sales data */}
            <Line
              type="monotone" // Smooth curve
              dataKey="sales"
              stroke="#0ea5e9" // Blue color for sales line
              strokeWidth={3}
              name="Sales"
              dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }} // Dots on the line
            />
            {/* Line for Profit data */}
            <Line
              type="monotone" // Smooth curve
              dataKey="profit"
              stroke="#06b6d4" // Cyan color for profit line
              strokeWidth={3}
              name="Profit"
              dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }} // Dots on the line
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// --- Main Application Component ---

/**
 * @typedef {object} SalesTrendData
 * @property {string} date - The date string (e.g., "YYYY-MM-DD").
 * @property {number} sales - The sales amount for the date.
 * @property {number} profit - The profit amount for the date.
 */

/**
 * App component that fetches (simulated) data and renders the SalesTrendChart.
 * @returns {JSX.Element} The main application component.
 */
function App() {
  const [salesTrendData, setSalesTrendData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRealData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // --- Simulate API Call ---
        // In a real application, you would replace this setTimeout with an actual fetch() call
        // to your backend API, like:
        // const response = await fetch('/api/sales-trends?period=last30days');
        // const data = await response.json();
        // setSalesTrendData(data);

        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

        // Generate some realistic-looking data for the last 30 days
        const today = new Date();
        const data = Array.from({ length: 30 }).map((_, i) => {
          const date = new Date(today);
          date.setDate(today.getDate() - (29 - i)); // Go back 29 days from today
          const dateString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD

          // Simulate sales and profit with some variance
          const baseSales = 10000 + Math.random() * 5000;
          const sales = Math.round(baseSales + (Math.sin(i / 5) * 3000));
          const profit = Math.round(sales * (0.15 + Math.random() * 0.1)); // Profit 15-25% of sales

          return { date: dateString, sales, profit };
        });

        setSalesTrendData(data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRealData();
  }, []); // Empty dependency array means this effect runs once on mount

  return (
    // Tailwind CSS setup: Ensure you have Tailwind CSS configured in your project
    // For a quick test, you can add this script tag to your HTML:
    // <script src="https://cdn.tailwindcss.com"></script>
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-inter">
      {/* Global styles for glow-text. You might put this in your index.css or equivalent. */}
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');

        .futuristic-card {
          border: 1px solid #0ea5e9; /* Blue border */
          box-shadow: 0 0 20px rgba(14, 165, 233, 0.5); /* Blue glow shadow */
        }

        .glow-text {
          text-shadow: 0 0 8px rgba(59, 130, 246, 0.7), 0 0 15px rgba(59, 130, 246, 0.4); /* Blue glow */
        }
        `}
      </style>

      <div className="w-full max-w-4xl">
        {isLoading ? (
          <div className="text-center text-cyan-400 text-xl">Loading sales data...</div>
        ) : error ? (
          <div className="text-center text-red-500 text-xl">{error}</div>
        ) : (
          <SalesTrendChart data={salesTrendData} />
        )}
      </div>
    </div>
  );
}

export default App; // Export the main App component
