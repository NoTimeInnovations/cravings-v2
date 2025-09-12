"use client";

import { fetchFromHasura } from '@/lib/hasuraClient';
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Store, Phone } from 'lucide-react';
import { FaRupeeSign } from 'react-icons/fa';
import Link from 'next/link';

interface Partner {
  id: string;
  store_name: string;
  country_code: string;
  phone: string;
  isPaid: boolean;
  status: string;
}

const PartnersQuery = `
  query Partners {
    partners {
      id
      store_name
      country_code
      phone
      isPaid
      status
    }
  }
`;

const UpdatePartnerPaymentMutation = `
  mutation UpdatePartnerPayment($id: uuid!, $isPaid: Boolean!) {
    update_partners_by_pk(pk_columns: {id: $id}, _set: {isPaid: $isPaid}) {
      id
      isPaid
    }
  }
`;

const UpdatePartnerStatusMutation = `
  mutation UpdatePartnerStatus($id: uuid!, $status: String!) {
    update_partners_by_pk(pk_columns: {id: $id}, _set: {status: $status}) {
      id
      status
    }
  }
`;

const PartnerPayments = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const { partners } = await fetchFromHasura(PartnersQuery);
      setPartners(partners);
      setFilteredPartners(partners);
    } catch (err) {
      setError('Failed to fetch partners');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updatePartnerPayment = async (id: string, isPaid: boolean) => {
    try {
      setUpdatingPaymentId(id);
      await fetchFromHasura(UpdatePartnerPaymentMutation, { id, isPaid });
      // Update local state to reflect the change
      setPartners(prevPartners => 
        prevPartners.map(partner => 
          partner.id === id ? {...partner, isPaid} : partner
        )
      );
    } catch (err) {
      setError('Failed to update partner payment status');
      console.error(err);
      // Revert the change in UI if the update fails
      fetchPartners();
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const updatePartnerStatus = async (id: string, status: string) => {
    try {
      setUpdatingStatusId(id);
      await fetchFromHasura(UpdatePartnerStatusMutation, { id, status });
      // Update local state to reflect the change
      setPartners(prevPartners => 
        prevPartners.map(partner => 
          partner.id === id ? {...partner, status} : partner
        )
      );
    } catch (err) {
      setError('Failed to update partner status');
      console.error(err);
      // Revert the change in UI if the update fails
      fetchPartners();
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (term === '') {
      setFilteredPartners(partners);
    } else {
      const filtered = partners.filter(partner => 
        partner.store_name.toLowerCase().includes(term) || 
        partner.phone.toLowerCase().includes(term)
      );
      setFilteredPartners(filtered);
    }
  };

  const handlePaymentCheckboxChange = async (id: string, currentIsPaid: boolean) => {
    const newIsPaid = !currentIsPaid;
    
    // Optimistic UI update
    setPartners(prevPartners => 
      prevPartners.map(partner => 
        partner.id === id ? {...partner, isPaid: newIsPaid} : partner
      )
    );
    
    setFilteredPartners(prevPartners => 
      prevPartners.map(partner => 
        partner.id === id ? {...partner, isPaid: newIsPaid} : partner
      )
    );
    
    // Send update to server
    await updatePartnerPayment(id, newIsPaid);
  };

  const handleStatusCheckboxChange = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    // Optimistic UI update
    setPartners(prevPartners => 
      prevPartners.map(partner => 
        partner.id === id ? {...partner, status: newStatus} : partner
      )
    );
    
    setFilteredPartners(prevPartners => 
      prevPartners.map(partner => 
        partner.id === id ? {...partner, status: newStatus} : partner
      )
    );
    
    // Send update to server
    await updatePartnerStatus(id, newStatus);
  };

  const formatPhoneNumber = (countryCode: string, phone: string) => {
    return `${countryCode}${phone.trim()}`;
  };

  const handlePhoneClick = (countryCode: string, phone: string) => {
    const formattedPhone = formatPhoneNumber(countryCode, phone);
    window.location.href = `tel:${formattedPhone}`;
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredPartners(partners);
    } else {
      const filtered = partners.filter(partner => 
        partner.store_name.toLowerCase().includes(searchTerm) || 
        partner.phone.toLowerCase().includes(searchTerm)
      );
      setFilteredPartners(filtered);
    }
  }, [partners, searchTerm]);

  const paidPartnersCount = partners.filter(p => p.isPaid).length;
  const unpaidPartnersCount = partners.length - paidPartnersCount;
  const activePartnersCount = partners.filter(p => p.status === 'active').length;
  const inactivePartnersCount = partners.length - activePartnersCount;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-lg text-muted-foreground">Loading partners...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Partner Payments</h1>
        </div>
        <Card className="mt-6 border-destructive">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>{error}</p>
              <button 
                onClick={fetchPartners}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partners.length}</div>
            <p className="text-xs text-muted-foreground">All registered partners</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Partners</CardTitle>
            <FaRupeeSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidPartnersCount}</div>
            <p className="text-xs text-muted-foreground">Partners with completed payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Partners</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activePartnersCount}</div>
            <p className="text-xs text-muted-foreground">Currently active partners</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Rate</CardTitle>
            <FaRupeeSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {partners.length ? Math.round((paidPartnersCount / partners.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Of partners have paid</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partner Management</CardTitle>
          <CardDescription>
            View and manage partner payment and status. Click checkboxes to update.
          </CardDescription>
          <div className="relative mt-4 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or phone number..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Payment Status</TableHead>
                <TableHead className="text-center">Account Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.length > 0 ? (
                filteredPartners.map(partner => (
                  <TableRow 
                    key={partner.id} 
                    className={partner.status !== 'active' ? 'bg-red-50 hover:bg-red-100' : ''}
                  >
                    <TableCell className="font-medium">
                      <Link 
                        href={`/hotels/${partner.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {partner.store_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div 
                        className="flex items-center cursor-pointer hover:text-blue-600"
                        onClick={() => handlePhoneClick(partner.country_code, partner.phone)}
                      >
                        <Phone className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        {formatPhoneNumber(partner.country_code, partner.phone)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={partner.isPaid ? "default" : "secondary"} 
                        className={partner.isPaid ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                      >
                        {partner.isPaid ? "Paid" : "Unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={partner.status === 'active' ? "default" : "secondary"} 
                        className={partner.status === 'active' ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : "bg-red-100 text-red-800 hover:bg-red-100"}
                      >
                        {partner.status === 'active' ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-4">
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-muted-foreground mb-1">Payment</span>
                          <Checkbox
                            checked={partner.isPaid}
                            onCheckedChange={() => handlePaymentCheckboxChange(partner.id, partner.isPaid)}
                            disabled={updatingPaymentId === partner.id}
                            className="h-5 w-5"
                          />
                          {updatingPaymentId === partner.id && (
                            <div className="mt-1 animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          )}
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-muted-foreground mb-1">Status</span>
                          <Checkbox
                            checked={partner.status === 'active'}
                            onCheckedChange={() => handleStatusCheckboxChange(partner.id, partner.status)}
                            disabled={updatingStatusId === partner.id}
                            className="h-5 w-5"
                          />
                          {updatingStatusId === partner.id && (
                            <div className="mt-1 animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="h-8 w-8 text-muted-foreground mb-2" />
                      <p>No partners found</p>
                      <p className="text-sm text-muted-foreground">
                        Try adjusting your search term or add new partners
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerPayments;