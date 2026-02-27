import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggle = () => {
    const next = i18n.language === "pt-BR" ? "en" : "pt-BR";
    i18n.changeLanguage(next);
  };

  const label = i18n.language === "pt-BR" ? "EN" : "PT";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={toggle}
        >
          <Languages className="h-4 w-4" />
          <span className="text-xs font-medium">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {i18n.language === "pt-BR" ? "Switch to English" : "Mudar para Português"}
      </TooltipContent>
    </Tooltip>
  );
}
