/**
 * Standalone Metronome Page
 */

import { Metronome } from "@/components/practice/metronome";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Music, Info } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function MetronomePage() {
  const { t } = useTranslation();

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Clock className="h-8 w-8" />
          {t('tools.metronome.title')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('tools.metronome.subtitle')}
        </p>
      </div>

      <Metronome />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5" />
            {t('tools.metronome.tips.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Music className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">{t('tools.metronome.tips.startSlow.title')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('tools.metronome.tips.startSlow.description')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Music className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium">{t('tools.metronome.tips.subdivisions.title')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('tools.metronome.tips.subdivisions.description')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Music className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium">{t('tools.metronome.tips.accent.title')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('tools.metronome.tips.accent.description')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Music className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h4 className="font-medium">{t('tools.metronome.tips.oddTime.title')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('tools.metronome.tips.oddTime.description')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
