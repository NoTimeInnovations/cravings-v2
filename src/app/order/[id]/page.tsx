
import { Metadata } from 'next';
import OrderClient from './OrderClient';

export const metadata: Metadata = {
  title: 'Order Status',
  description: null,
  openGraph: null,
  twitter: null,
  alternates: null,
};

export default function OrderPage() {
  return <OrderClient />;
}
