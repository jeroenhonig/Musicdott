import { ABCNotationViewer } from "@/components/music-notation/abc-notation-viewer";
import { ArrowLeft, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";

export default function ABCNotationPage() {
  const { t } = useTranslation();

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Music className="h-6 w-6" />
            {t('tools.abcNotation.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('tools.abcNotation.subtitle')}
          </p>
        </div>
      </div>

      <ABCNotationViewer showEditor={true} />

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold">{t('tools.abcNotation.about.title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('tools.abcNotation.about.description')}
        </p>

        <h4 className="font-medium text-sm mt-4">{t('tools.abcNotation.quickRef.title')}</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li><code className="bg-muted px-1 rounded">X:1</code> - {t('tools.abcNotation.quickRef.tuneNumber')}</li>
          <li><code className="bg-muted px-1 rounded">T:Title</code> - {t('tools.abcNotation.quickRef.tuneTitle')}</li>
          <li><code className="bg-muted px-1 rounded">M:4/4</code> - {t('tools.abcNotation.quickRef.timeSignature')}</li>
          <li><code className="bg-muted px-1 rounded">L:1/4</code> - {t('tools.abcNotation.quickRef.noteLength')}</li>
          <li><code className="bg-muted px-1 rounded">K:C</code> - {t('tools.abcNotation.quickRef.keySignature')}</li>
          <li><code className="bg-muted px-1 rounded">C D E F</code> - {t('tools.abcNotation.quickRef.notes')}</li>
          <li><code className="bg-muted px-1 rounded">|</code> - {t('tools.abcNotation.quickRef.barLine')}</li>
        </ul>
      </div>
    </div>
  );
}
