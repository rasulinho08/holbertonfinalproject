import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Target } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth';
import { usePrefs } from '@/store/prefs';
import { useBooks, useGenres } from '@/api/hooks';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Progress } from '@/components/ui/Progress';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { GoalRing } from '@/components/charts/GoalRing';
import type { GenreSlug } from '@/types';

const MIN_GENRES = 3;
const GOAL_OPTIONS = [12, 20, 24, 30, 40, 52];
const TOTAL_STEPS = 3;

/**
 * The onboarding quiz from the spec: pick genres and authors, then set a yearly
 * goal. The answers feed `/books/recommendations` and the Home "For you" rail.
 */
export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();

  const savePreferences = useAuth((s) => s.savePreferences);
  const setGoal = useAuth((s) => s.setGoal);
  const setOnboardingDone = usePrefs((s) => s.setOnboardingDone);

  const { data: genres } = useGenres();
  // The author step offers the authors behind the highest-rated books.
  const { data: bookPages } = useBooks({ sort: 'rating' });

  const [step, setStep] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState<GenreSlug[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [goal, setGoalValue] = useState(24);
  const [busy, setBusy] = useState(false);

  const authorOptions = useMemo(() => {
    const books = bookPages?.pages.flatMap((p) => p.data) ?? [];
    const seen = new Map<string, string>();
    for (const book of books) {
      if (!seen.has(book.authorId)) seen.set(book.authorId, book.authorName);
      if (seen.size >= 18) break;
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [bookPages]);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const canContinue = step === 0 ? selectedGenres.length >= MIN_GENRES : true;

  const finish = async () => {
    setBusy(true);
    try {
      await savePreferences({
        favoriteGenres: selectedGenres,
        favoriteAuthorIds: selectedAuthors,
      });
      await setGoal(goal);
      setOnboardingDone(true);
      router.replace('/');
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const skip = () => {
    setOnboardingDone(true);
    router.replace('/');
  };

  return (
    <Screen contentStyle={{ gap: theme.spacing.xl, paddingTop: theme.spacing['2xl'] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        {step > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={8}
            onPress={() => setStep((s) => s - 1)}
          >
            <ArrowLeft size={20} color={theme.colors.fg} />
          </Pressable>
        ) : null}

        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="caption" color="fgSubtle">
            {t('onboarding.step', { current: step + 1, total: TOTAL_STEPS })}
          </Text>
          <Progress value={((step + 1) / TOTAL_STEPS) * 100} height={5} />
        </View>

        <Pressable accessibilityRole="button" hitSlop={8} onPress={skip}>
          <Text variant="smallStrong" color="fgSubtle">
            {t('common.skip')}
          </Text>
        </Pressable>
      </View>

      {step === 0 ? (
        <View style={{ gap: theme.spacing.lg }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Text variant="h1">{t('onboarding.genresTitle')}</Text>
            <Text variant="small" color="fgMuted">
              {t('onboarding.genresSubtitle')}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {(genres ?? []).map((genre) => (
              <Chip
                key={genre.slug}
                label={t(`genres.${genre.slug}`)}
                count={genre.bookCount}
                selected={selectedGenres.includes(genre.slug)}
                onPress={() => setSelectedGenres((prev) => toggle(prev, genre.slug))}
              />
            ))}
          </View>

          {selectedGenres.length < MIN_GENRES ? (
            <Text variant="small" color="fgSubtle">
              {t('onboarding.selectAtLeast', { count: MIN_GENRES - selectedGenres.length })}
            </Text>
          ) : null}
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ gap: theme.spacing.lg }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Text variant="h1">{t('onboarding.authorsTitle')}</Text>
            <Text variant="small" color="fgMuted">
              {t('onboarding.authorsSubtitle')}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
            {authorOptions.map((author) => {
              const selected = selectedAuthors.includes(author.id);
              return (
                <Pressable
                  key={author.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={author.name}
                  onPress={() => setSelectedAuthors((prev) => toggle(prev, author.id))}
                  style={{ width: 92, alignItems: 'center', gap: 6 }}
                >
                  <View>
                    <Avatar name={author.name} size={62} />
                    {selected ? (
                      <View
                        style={{
                          position: 'absolute',
                          right: -2,
                          bottom: -2,
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: theme.colors.primary,
                          borderWidth: 2,
                          borderColor: theme.colors.bg,
                        }}
                      >
                        <Check size={12} color={theme.colors.primaryFg} />
                      </View>
                    ) : null}
                  </View>
                  <Text variant="caption" center numberOfLines={2} color={selected ? 'primary' : 'fgMuted'}>
                    {author.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: theme.spacing.xl }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Text variant="h1">{t('onboarding.goalTitle')}</Text>
            <Text variant="small" color="fgMuted">
              {t('onboarding.goalSubtitle')}
            </Text>
          </View>

          <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
            <GoalRing value={0} target={goal} size={150} caption={t('onboarding.booksPerYear')} />
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, justifyContent: 'center' }}>
            {GOAL_OPTIONS.map((option) => (
              <Chip
                key={option}
                label={String(option)}
                selected={goal === option}
                icon={goal === option ? <Target size={13} color={theme.colors.primary} /> : undefined}
                onPress={() => setGoalValue(option)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.md }}>
        {step < TOTAL_STEPS - 1 ? (
          <Button
            title={t('common.next')}
            disabled={!canContinue}
            onPress={() => setStep((s) => s + 1)}
          />
        ) : (
          <Button title={t('onboarding.finish')} loading={busy} onPress={finish} />
        )}
      </View>
    </Screen>
  );
}
