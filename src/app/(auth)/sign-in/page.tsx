"use client";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, RefreshCw } from "lucide-react";

export default function SignInPage() {
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaValue, setCaptchaValue] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaUserInput, setCaptchaUserInput] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(true); // Always show CAPTCHA
  const [sessionTimeout, setSessionTimeout] = useState(0);
  const [captchaError, setCaptchaError] = useState("");

  // Generate simple math CAPTCHA
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ["+", "-", "×"];
    const operator = operators[Math.floor(Math.random() * operators.length)];

    let answer;
    switch (operator) {
      case "+":
        answer = num1 + num2;
        break;
      case "-":
        answer = num1 - num2;
        break;
      case "×":
        answer = num1 * num2;
        break;
      default:
        answer = num1 + num2;
    }

    setCaptchaValue(`${num1} ${operator} ${num2} = ?`);
    setCaptchaAnswer(String(answer));
    setCaptchaUserInput("");
    setCaptchaError("");
  };

  useEffect(() => {
    if (showCaptcha) {
      generateCaptcha();
    }
  }, [showCaptcha]);

  // Session timeout warning
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTimeout((prev) => {
        if (prev >= 30 * 60 * 1000) {
          // 30 minutes
          return 0;
        }
        return prev + 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate CAPTCHA if required
    if (showCaptcha) {
      if (!captchaUserInput.trim()) {
        setCaptchaError("Please complete the security check");
        return;
      }
      if (captchaUserInput.trim() !== captchaAnswer) {
        setCaptchaError("Incorrect answer. Please try again.");
        generateCaptcha(); // Generate new CAPTCHA on wrong answer
        return;
      }
    }

    setLoading(true);
    const res = await signIn("credentials", {
      redirect: false,
      staffCode: code,
      pin,
    });
    setLoading(false);

    if (res?.ok) {
      setFailedAttempts(0);
      setCaptchaError("");
      window.location.href = "/dashboard";
    } else {
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      alert("Invalid code or PIN");
    }
  }

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Security Alert */}
      {failedAttempts > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {failedAttempts} failed login attempt{failedAttempts > 1 ? "s" : ""}
          </AlertDescription>
        </Alert>
      )}

      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-emerald-600" />
          </div>
          <CardTitle className="text-xl">Staff Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staffCode">Staff Code</Label>
              <Input
                id="staffCode"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="ABC"
                className="text-center text-lg font-mono"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                type="password"
                placeholder="••••"
                className="text-center text-lg font-mono"
                disabled={loading}
              />
            </div>

            {/* Enhanced CAPTCHA */}
            {showCaptcha && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">
                    Security Check Required
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateCaptcha}
                    className="h-8 w-8 p-0"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800 mb-2">
                    {captchaValue}
                  </div>
                  <Input
                    id="captcha"
                    value={captchaUserInput}
                    onChange={(e) => {
                      setCaptchaUserInput(e.target.value);
                      setCaptchaError("");
                    }}
                    placeholder="Enter your answer"
                    className="text-center text-lg font-mono max-w-[120px] mx-auto"
                    disabled={loading}
                  />
                  {captchaError && (
                    <p className="text-red-600 text-sm mt-2">{captchaError}</p>
                  )}
                </div>
              </div>
            )}

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Session timeout warning */}
      {sessionTimeout > 25 * 60 * 1000 && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">
            Session will timeout in{" "}
            {Math.ceil((30 * 60 * 1000 - sessionTimeout) / 60000)} minutes
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
