import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Vault, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get("type") === "recovery") {
      setIsRecovery(true);
    }

    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: t("auth.error"), description: t("auth.passwordsDontMatch") });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ variant: "destructive", title: t("auth.error"), description: error.message });
    } else {
      toast({ title: t("auth.passwordUpdated"), description: t("auth.canLoginNow") });
      navigate("/login");
    }

    setIsLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t("auth.invalidLink")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <Vault className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">{t("auth.newPassword")}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("auth.setNewPassword")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleReset}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">{t("auth.newPassword")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("auth.minChars")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-foreground">{t("auth.confirmPassword")}</Label>
              <Input
                id="confirm"
                type="password"
                placeholder={t("auth.repeatPassword")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.updatePassword")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
