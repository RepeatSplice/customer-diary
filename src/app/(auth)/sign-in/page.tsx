"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", {
      redirect: false,
      staffCode: code,
      pin,
    });
    setLoading(false);
    if (res?.ok) window.location.href = "/dashboard";
    else alert("Invalid code or PIN");
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Staff Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-sm">Staff Code</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={3}
              placeholder="ABC"
            />
          </div>
          <div>
            <label className="text-sm">PIN</label>
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              type="password"
              placeholder="••••"
            />
          </div>
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
