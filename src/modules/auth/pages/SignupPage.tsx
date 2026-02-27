import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Vault, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger as loggerFactory } from "@/lib/logger";

const log = loggerFactory.create("SignupPage");

export function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      log.error("Signup failed:", error.message);
      toast({
        variant: "destructive",
        title: t("auth.signupFailed"),
        description: error.message,
      });
    } else {
      toast({
        title: t("auth.accountCreated"),
        description: t("auth.checkEmail"),
      });
      navigate("/login");
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
          <CardTitle className="text-2xl font-bold text-foreground">{t("auth.signupTitle")}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("auth.signupSubtitle")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">{t("auth.nameLabel")}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t("auth.namePlaceholder")}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
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
              <Label htmlFor="password" className="text-foreground">{t("auth.passwordLabel")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("auth.minChars")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {t("auth.signupTitle")} <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t("auth.alreadyHaveAccount")}{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                {t("auth.login")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
