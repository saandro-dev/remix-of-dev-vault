import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Vault, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger as loggerFactory } from "@/lib/logger";

const log = loggerFactory.create("LoginPage");

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      log.error("Login failed:", error.message);
      toast({
        variant: "destructive",
        title: t("auth.loginFailed"),
        description: error.message === "Invalid login credentials"
          ? t("auth.invalidCredentials")
          : error.message,
      });
    } else {
      navigate(from, { replace: true });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <Vault className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">{t("auth.loginTitle")}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("auth.loginSubtitle")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">{t("common.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground">{t("auth.passwordLabel")}</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {t("auth.login")} <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t("auth.noAccount")}{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                {t("auth.createAccount")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
