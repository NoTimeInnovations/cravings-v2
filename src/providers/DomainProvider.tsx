"use client";

import React, { createContext, useContext } from 'react';
import { DomainConfig } from '@/lib/domain-utils';

const DomainContext = createContext<DomainConfig | null>(null);

export const DomainProvider = ({
    children,
    config
}: {
    children: React.ReactNode;
    config: DomainConfig;
}) => {
    return (
        <DomainContext.Provider value={config}>
            {children}
        </DomainContext.Provider>
    );
};

export const useDomain = () => {
    const context = useContext(DomainContext);
    if (!context) {
        throw new Error('useDomain must be used within a DomainProvider');
    }
    return context;
};
