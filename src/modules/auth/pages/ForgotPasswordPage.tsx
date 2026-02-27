import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Vault, ArrowLeft, Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({ variant: "destructive", title: t("auth.error"), description: error.message });
    } else {
      setSent(true);
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
          <CardTitle className="text-2xl font-bold text-foreground">{t("auth.recoverPassword")}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {sent ? t("auth.emailSent") : t("auth.recoverSubtitle")}
          </CardDescription>
        </CardHeader>
        {sent ? (
          <CardContent className="text-center space-y-4">
            <Mail className="h-12 w-12 text-success mx-auto" />
            <p className="text-sm text-muted-foreground">
              {t("auth.checkInbox")}
            </p>
          </CardContent>
        ) : (
          <form onSubmit={handleReset}>
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
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.sendLink")}
              </Button>
            </CardFooter>
          </form>
        )}
        <CardFooter className="justify-center">
          <Link to="/login" className="text-sm text-primary hover:underline flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> {t("auth.backToLogin")}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
