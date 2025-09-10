"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, AlertCircle, Star } from "lucide-react";
import { format } from "date-fns";

interface CustomerStatsProps {
  customer: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    accountNo?: string | null;
    diariesTotal?: number;
    activeTotal?: number;
    overdueTotal?: number;
    lastActivityAt?: string | null;
  };
}

export default function QuickCustomerStats({ customer }: CustomerStatsProps) {
  return (
    <Card className="rounded-xl border border-green-200 bg-green-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-green-800">
          Customer History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(customer.diariesTotal ?? 0) > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <FileText className="h-3 w-3 mr-1" />
              {customer.diariesTotal} total diaries
            </Badge>
          )}

          {(customer.activeTotal ?? 0) > 0 && (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <AlertCircle className="h-3 w-3 mr-1" />
              {customer.activeTotal} active
            </Badge>
          )}

          {(customer.overdueTotal ?? 0) > 0 && (
            <Badge
              variant="destructive"
              className="bg-red-100 text-red-800 border-red-200"
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              {customer.overdueTotal} overdue
            </Badge>
          )}
        </div>

        {customer.lastActivityAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              Last activity:{" "}
              {format(new Date(customer.lastActivityAt), "dd MMM yyyy")}
            </span>
          </div>
        )}

        {(customer.diariesTotal ?? 0) === 0 && (
          <div className="text-sm text-green-700 italic flex items-center gap-2">
            <Star className="h-4 w-4" />
            This will be their first diary entry!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
