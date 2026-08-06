import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useGenres } from '@/api/hooks';
import { formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import type { BookFilters, BookLanguage, GenreSlug } from '@/types';

export type Filters = Required<Pick<BookFilters, 'genres' | 'languages'>> &
  Pick<BookFilters, 'minRating' | 'minPrice' | 'maxPrice' | 'sort'>;

export const EMPTY_FILTERS: Filters = {
  genres: [],
  languages: [],
  minRating: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  sort: 'relevance',
};

const LANGUAGES: BookLanguage[] = ['az', 'en', 'tr', 'ru'];
const RATINGS = [6, 7, 8, 9];

/** Count of non-default filters — drives the badge on the filter button. */
export function activeFilterCount(filters: Filters): number {
  let count = 0;
  count += filters.genres.length;
  count += filters.languages.length;
  if (filters.minRating) count += 1;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count += 1;
  if (filters.sort && filters.sort !== 'relevance') count += 1;
  return count;
}

export interface FilterSheetProps {
  visible: boolean;
  value: Filters;
  onClose: () => void;
  onApply: (filters: Filters) => void;
}

/** The spec's filtering system: language, genre, rating and price range. */
export function FilterSheet({ visible, value, onClose, onApply }: FilterSheetProps) {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const { data: genres } = useGenres();

  const [draft, setDraft] = useState<Filters>(value);

  // Reopening the sheet always starts from the currently applied filters.
  // Adjusted during render rather than in an effect, so the first frame after
  // opening already shows the right state.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(value);
  }

  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((v) => v !== item) : [...list, item];

  return (
    <Sheet visible={visible} onClose={onClose} title={t('explore.filters')}>
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="caption" color="fgSubtle">
          {t('explore.sort').toUpperCase()}
        </Text>
        <SegmentedControl
          value={draft.sort ?? 'relevance'}
          onChange={(sort) => setDraft((d) => ({ ...d, sort }))}
          options={[
            { value: 'relevance', label: t('explore.sortRelevance') },
            { value: 'rating', label: t('explore.sortRating') },
            { value: 'newest', label: t('explore.sortNewest') },
          ]}
        />
        <SegmentedControl
          value={draft.sort === 'price_desc' ? 'price_desc' : 'price_asc'}
          onChange={(sort) => setDraft((d) => ({ ...d, sort }))}
          options={[
            { value: 'price_asc', label: t('explore.sortPriceAsc') },
            { value: 'price_desc', label: t('explore.sortPriceDesc') },
          ]}
        />
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="caption" color="fgSubtle">
          {t('explore.genre').toUpperCase()}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {(genres ?? []).map((genre) => (
            <Chip
              key={genre.slug}
              label={t(`genres.${genre.slug}`)}
              selected={draft.genres.includes(genre.slug)}
              onPress={() =>
                setDraft((d) => ({ ...d, genres: toggle<GenreSlug>(d.genres, genre.slug) }))
              }
            />
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="caption" color="fgSubtle">
          {t('explore.language').toUpperCase()}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {LANGUAGES.map((language) => (
            <Chip
              key={language}
              label={t(`languages.${language}`)}
              selected={draft.languages.includes(language)}
              onPress={() =>
                setDraft((d) => ({ ...d, languages: toggle<BookLanguage>(d.languages, language) }))
              }
            />
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="caption" color="fgSubtle">
          {t('explore.minRating').toUpperCase()}
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {RATINGS.map((rating) => (
            <Chip
              key={rating}
              label={`${rating}+`}
              selected={draft.minRating === rating}
              onPress={() =>
                setDraft((d) => ({ ...d, minRating: d.minRating === rating ? undefined : rating }))
              }
            />
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="caption" color="fgSubtle">
          {t('explore.priceRange').toUpperCase()}
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Input
            containerStyle={{ flex: 1 }}
            value={draft.minPrice !== undefined ? String(draft.minPrice) : ''}
            onChangeText={(v) =>
              setDraft((d) => ({ ...d, minPrice: v ? Number(v) : undefined }))
            }
            placeholder={formatPrice(0, locale)}
            keyboardType="numeric"
            inputMode="decimal"
          />
          <Input
            containerStyle={{ flex: 1 }}
            value={draft.maxPrice !== undefined ? String(draft.maxPrice) : ''}
            onChangeText={(v) =>
              setDraft((d) => ({ ...d, maxPrice: v ? Number(v) : undefined }))
            }
            placeholder={formatPrice(50, locale)}
            keyboardType="numeric"
            inputMode="decimal"
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Button
          title={t('common.reset')}
          variant="outline"
          style={{ flex: 1 }}
          onPress={() => setDraft(EMPTY_FILTERS)}
        />
        <Button title={t('common.apply')} style={{ flex: 1 }} onPress={() => onApply(draft)} />
      </View>
    </Sheet>
  );
}
