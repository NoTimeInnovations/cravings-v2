import React from 'react';

export const metadata = {
  title: 'Analytics Dashboard | Menuthere Admin',
  description: 'Analytics dashboard for monitoring performance metrics',
};

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section>{children}</section>
  );
} 