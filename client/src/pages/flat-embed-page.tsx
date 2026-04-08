import { FlatEmbedViewer } from "@/components/music-notation/flat-embed-viewer";
import { ArrowLeft, FileMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";

export default function FlatEmbedPage() {
  const { t } = useTranslation();

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileMusic className="h-6 w-6" />
            {t('tools.flatEmbed.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('tools.flatEmbed.subtitle')}
          </p>
        </div>
      </div>

      <FlatEmbedViewer height={500} />

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold">{t('tools.flatEmbed.howToUse')}</h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>
            <strong>{t('tools.flatEmbed.loadScore')}</strong> {t('tools.flatEmbed.loadScoreDescription')}
          </li>
          <li>
            <strong>{t('tools.flatEmbed.playback')}</strong> {t('tools.flatEmbed.playbackDescription')}
          </li>
          <li>
            <strong>{t('tools.flatEmbed.zoom')}</strong> {t('tools.flatEmbed.zoomDescription')}
          </li>
          <li>
            <strong>{t('tools.flatEmbed.findScores')}</strong> {t('tools.flatEmbed.findScoresDescription')}{" "}
            <a
              href="https://flat.io/community"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {t('tools.flatEmbed.findScoresCommunity')}
            </a>{" "}
            {t('tools.flatEmbed.findScoresSuffix')}
          </li>
        </ul>
      </div>
    </div>
  );
}
