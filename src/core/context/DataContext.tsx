import React, { createContext, useContext, useMemo } from 'react';
import { IDataProvider } from '../services/IDataProvider';
import { ElectronAdapter } from '../adapters/ElectronAdapter';

export const DataContext = createContext<IDataProvider | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // In the future, this can logic to switch between ElectronAdapter, CloudAdapter, etc.
    const adapter = useMemo(() => new ElectronAdapter(), []);

    return (
        <DataContext.Provider value={adapter}>
            {children}
        </DataContext.Provider>
    );
};

export const useDataService = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useDataService must be used within a DataProvider');
    }
    return context;
};
