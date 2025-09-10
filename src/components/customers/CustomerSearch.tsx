"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, User, Check, X, Mail, Phone, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  accountNo?: string | null;
  diariesTotal?: number;
  activeTotal?: number;
}

interface CustomerSearchProps {
  onSelect: (customer: Customer | null) => void;
  selectedCustomer?: Customer | null;
  placeholder?: string;
  className?: string;
}

export default function CustomerSearch({
  onSelect,
  selectedCustomer,
  placeholder = "Search for existing customer...",
  className,
}: CustomerSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Load recent customers on mount
  useEffect(() => {
    const loadRecentCustomers = async () => {
      try {
        const response = await fetch("/api/customers?limit=10");
        if (response.ok) {
          const data = await response.json();
          setRecentCustomers(data.slice(0, 10));
        }
      } catch (error) {
        console.error("Failed to load recent customers:", error);
      }
    };
    loadRecentCustomers();
  }, []);

  // Search customers when query changes
  useEffect(() => {
    const searchCustomers = async () => {
      if (debouncedQuery.length < 2) {
        setCustomers([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `/api/customers?query=${encodeURIComponent(debouncedQuery)}&limit=20`
        );
        if (response.ok) {
          const data = await response.json();
          setCustomers(data);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    };

    if (debouncedQuery) {
      searchCustomers();
    }
  }, [debouncedQuery]);

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (!isOpen && value) {
        setIsOpen(true);
      }
    },
    [isOpen]
  );

  const handleSelectCustomer = useCallback(
    (customer: Customer) => {
      onSelect(customer);
      setQuery(customer.name);
      setIsOpen(false);
    },
    [onSelect]
  );

  const handleClearSelection = useCallback(() => {
    onSelect(null);
    setQuery("");
    setIsOpen(false);
  }, [onSelect]);

  const handleNewCustomer = useCallback(() => {
    onSelect(null);
    setQuery("");
    setIsOpen(false);
  }, [onSelect]);

  // Note: displayCustomers removed as it was unused - we directly check conditions in JSX

  const CustomerItem = ({ customer }: { customer: Customer }) => (
    <div
      className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
      onClick={() => handleSelectCustomer(customer)}
    >
      <div className="flex-1">
        <div className="font-medium">{customer.name}</div>
        <div className="text-sm text-muted-foreground space-y-1">
          {customer.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3" />
              <span>{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3" />
              <span>{customer.phone}</span>
            </div>
          )}
          {customer.accountNo && (
            <div className="flex items-center gap-2">
              <CreditCard className="h-3 w-3" />
              <span>{customer.accountNo}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {(customer.diariesTotal ?? 0) > 0 && (
          <Badge variant="secondary" className="text-xs">
            {customer.diariesTotal} diaries
          </Badge>
        )}
        {(customer.activeTotal ?? 0) > 0 && (
          <Badge
            variant="default"
            className="text-xs bg-green-100 text-green-800"
          >
            {customer.activeTotal} active
          </Badge>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn("relative", className)}>
      {/* Selected Customer Display */}
      {selectedCustomer && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <div>
                <div className="font-medium text-green-800">
                  {selectedCustomer.name}
                </div>
                <div className="text-sm text-green-600">
                  {selectedCustomer.email && `${selectedCustomer.email} • `}
                  {selectedCustomer.phone && `${selectedCustomer.phone}`}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="text-green-600 hover:text-green-800 hover:bg-green-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-9"
          disabled={!!selectedCustomer}
        />
      </div>

      {/* Dropdown Results */}
      {isOpen && !selectedCustomer && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-y-auto shadow-lg">
          <CardContent className="p-0">
            {loading && (
              <div className="p-4 text-center text-muted-foreground">
                <div className="animate-pulse">Searching customers...</div>
              </div>
            )}

            {!loading &&
              debouncedQuery.length >= 2 &&
              customers.length === 0 && (
                <div className="p-4 text-center">
                  <div className="text-muted-foreground mb-3">
                    No customers found for &ldquo;{debouncedQuery}&rdquo;
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNewCustomer}
                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Create new customer
                  </Button>
                </div>
              )}

            {!loading &&
              debouncedQuery.length < 2 &&
              recentCustomers.length > 0 && (
                <>
                  <div className="p-3 border-b bg-muted/30">
                    <div className="text-sm font-medium text-muted-foreground">
                      Recent Customers
                    </div>
                  </div>
                  {recentCustomers.map((customer) => (
                    <CustomerItem key={customer.id} customer={customer} />
                  ))}
                </>
              )}

            {!loading && debouncedQuery.length >= 2 && customers.length > 0 && (
              <>
                <div className="p-3 border-b bg-muted/30">
                  <div className="text-sm font-medium text-muted-foreground">
                    Search Results ({customers.length})
                  </div>
                </div>
                {customers.map((customer) => (
                  <CustomerItem key={customer.id} customer={customer} />
                ))}
              </>
            )}

            {!loading && (
              <div className="p-3 border-t bg-muted/20">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewCustomer}
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                >
                  <User className="h-4 w-4 mr-2" />
                  {debouncedQuery
                    ? `Create new customer "${debouncedQuery}"`
                    : "Create new customer"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
