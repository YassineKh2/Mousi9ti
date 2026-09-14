import React, { createContext, useContext } from 'react';
import { AppSettings } from '../types';

export const SettingsContext = createContext<AppSettings | null>(null);

export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
};
