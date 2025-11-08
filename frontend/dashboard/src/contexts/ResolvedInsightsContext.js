import React, { createContext, useContext, useState, useEffect } from 'react';

const ResolvedInsightsContext = createContext();

export function ResolvedInsightsProvider({ children }) {
  const [resolvedItems, setResolvedItems] = useState(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem('resolvedInsights');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading resolved insights:', error);
    }
    return [];
  });

  // Save to localStorage whenever resolvedItems changes
  useEffect(() => {
    try {
      localStorage.setItem('resolvedInsights', JSON.stringify(resolvedItems));
    } catch (error) {
      console.error('Error saving resolved insights:', error);
    }
  }, [resolvedItems]);

  const addResolvedItem = (item) => {
    console.log('📝 addResolvedItem called with:', item);
    setResolvedItems(prev => {
      const prevArray = Array.isArray(prev) ? prev : [];
      console.log('📝 Previous resolved items:', prevArray.length);
      
      // Check if item already exists (avoid duplicates)
      const exists = prevArray.some(existing => 
        existing.type === item.type &&
        existing.itemId === item.itemId &&
        JSON.stringify(existing.item) === JSON.stringify(item.item)
      );
      
      if (exists) {
        console.log('⚠️ Item already resolved, skipping');
        return prevArray;
      }
      
      // Add new resolved item with timestamp
      const newItem = {
        ...item,
        resolvedAt: new Date().toISOString(),
        id: `${item.type}-${item.itemId}-${Date.now()}`
      };
      
      console.log('✅ Adding new resolved item:', newItem);
      
      // Keep only last 500 resolved items
      const updated = [newItem, ...prevArray].slice(0, 500);
      console.log('📝 Updated resolved items count:', updated.length);
      return updated;
    });
  };

  const clearResolvedItems = () => {
    setResolvedItems([]);
    localStorage.removeItem('resolvedInsights');
  };

  return (
    <ResolvedInsightsContext.Provider value={{ resolvedItems, addResolvedItem, clearResolvedItems }}>
      {children}
    </ResolvedInsightsContext.Provider>
  );
}

export function useResolvedInsights() {
  const context = useContext(ResolvedInsightsContext);
  if (!context) {
    throw new Error('useResolvedInsights must be used within ResolvedInsightsProvider');
  }
  return context;
}

