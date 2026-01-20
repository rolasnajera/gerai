import { useContext } from 'react';
import { DataContext } from '../context/DataContext';

export const useDataService = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useDataService must be used within a DataProvider');
    }
    return context;
};
