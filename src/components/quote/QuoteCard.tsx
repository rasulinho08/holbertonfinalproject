import React from 'react';
import { Platform, Pressable, Share, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Heart, MessageCircle, MoreHorizontal, Share2 } from 'lucide-react-native';

import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { formatCount, formatRelative } from '@/lib/format';
import { quoteBackground, type QuoteBackground } from '@/theme/quoteBackgrounds';
import { BookCover } from '@/components/book/BookCover';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import type { Quote } from '@/types';

/** Re-exported so callers that already import from this module keep working. */
export { quoteBackground as getQuoteBackground };

type PageSize = 'compact' | 'feed' | 'full';

export interface QuotePageProps {
  background: QuoteBackground;
  text: string;
  bookTitle?: string | null;
  authorName?: string | null;
  coverUrl?: string | null;
  page?: number | string | null;
  /** `compact` for carousels, `feed` clamps long passages, `full` never clamps. */
  size?: PageSize;
  /** Shown in place of `text` while it is empty, at lower emphasis. */
  placeholder?: string;
  /** Must be unique on screen: SVG gradient ids are document-global on web. */
  gradientId: string;
}

/** Long passages step down in size so a paragraph still fits on a phone. */
function textMetrics(length: number, size: PageSize) {
  if (size === 'compact') return { fontSize: 15, lineHeight: 22, lines: 5 };
  if (length <= 90) return { fontSize: 23, lineHeight: 32, lines: undefined };
  if (length <= 220) return { fontSize: 19, lineHeight: 28, lines: size === 'feed' ? 8 : undefined };
  return { fontSize: 17, lineHeight: 26, lines: size === 'feed' ? 9 : undefined };
}

/**
 * The coloured "page" of a quote: the passage set in serif under a large
 * opening mark, and the book it came from underneath.
 *
 * Shared by the card and the composer's live preview, so what the reader sees
 * while writing is exactly what gets published.
 */
export function QuotePage({
  background: bg,
  text,
  bookTitle,
  authorName,
  coverUrl,
  page,
  size = 'feed',
  placeholder,
  gradientId,
}: QuotePageProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const compact = size === 'compact';
  const shown = text || placeholder || '';
  const metrics = textMetrics(shown.length, size);
  const pad = compact ? theme.spacing.lg : theme.spacing['2xl'];

  const meta = [authorName, page ? `${t('common.page')} ${page}` : null].filter(Boolean).join(' · ');

  return (
    <View style={{ padding: pad, paddingTop: compact ? theme.spacing.md : theme.spacing.lg }}>
      {/* Pinned to all four edges, so it covers the padding too. */}
      <Svg
        pointerEvents="none"
        width="100%"
        height="100%"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={bg.colors[0]} />
            <Stop offset="1" stopColor={bg.colors[1]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>

      <Text
        serif
        accessible={false}
        style={{
          color: bg.accent,
          fontSize: compact ? 48 : 72,
          lineHeight: compact ? 48 : 72,
          height: compact ? 30 : 46,
          fontWeight: '700',
        }}
      >
        “
      </Text>

      <Text
        serif
        numberOfLines={metrics.lines}
        style={{
          color: bg.text,
          opacity: text ? 1 : 0.6,
          fontSize: metrics.fontSize,
          lineHeight: metrics.lineHeight,
          fontWeight: '500',
        }}
      >
        {shown}
      </Text>

      {bookTitle ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            marginTop: compact ? theme.spacing.md : theme.spacing.xl,
          }}
        >
          {!compact ? (
            <BookCover title={bookTitle} authorName={authorName ?? undefined} uri={coverUrl} width={30} radius={4} />
          ) : (
            <View style={{ width: 16, height: 1.5, backgroundColor: bg.accent }} />
          )}
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{ color: bg.accent, fontSize: compact ? 12 : 14, lineHeight: compact ? 16 : 19, fontWeight: '700' }}
            >
              {bookTitle}
            </Text>
            {meta && !compact ? (
              <Text numberOfLines={1} style={{ color: bg.muted, fontSize: 12, lineHeight: 17 }}>
                {meta}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export interface QuoteCardProps {
  quote: Quote;
  onLike?: (liked: boolean) => void;
  onComment?: () => void;
  onMore?: () => void;

  /** Compact cards drop the footer — used inside book detail carousels. */
  compact?: boolean;
  /** Shows the whole passage, however long — the quote's own screen. */
  full?: boolean;

  style?: ViewStyle;
}

export function QuoteCard({ quote, onLike, onComment, onMore, compact, full, style }: QuoteCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { t, locale } = useI18n();

  const bg = quoteBackground(quote.background);
  const radius = compact ? theme.radius.lg : theme.radius.xl;
  const open = () => router.push(`/quote/${quote.id}`);

  const share = async () => {
    const message = `“${quote.text}”\n— ${quote.book.title}, ${quote.book.authorName}`;
    try {
      // react-native-web's Share needs the Web Share API, which most desktop
      // browsers lack; copying is the useful fallback there.
      if (Platform.OS === 'web' && typeof navigator.share !== 'function') {
        await navigator.clipboard.writeText(message);
        toast.success(t('quote.copied'));
        return;
      }
      await Share.share({ message });
    } catch {
      // Dismissing the share sheet rejects on some platforms; nothing to report.
    }
  };

  const page = (
    <QuotePage
      background={bg}
      text={quote.text}
      bookTitle={quote.book.title}
      authorName={quote.book.authorName}
      coverUrl={quote.book.coverUrl}
      page={quote.page}
      size={compact ? 'compact' : full ? 'full' : 'feed'}
      gradientId={`quote-${quote.id}${compact ? '-c' : full ? '-f' : ''}`}
    />
  );

  return (
    <View style={[{ borderRadius: radius, ...theme.elevation(compact ? 1 : 2) }, style]}>
      <View
        style={{
          borderRadius: radius,
          overflow: 'hidden',
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        {full ? (
          page
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${quote.text} — ${quote.book.title}`}
            onPress={open}
          >
            {page}
          </Pressable>
        )}

        {!compact ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.lg,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={quote.user.name}
              onPress={() => router.push(`/user/${quote.user.username}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 }}
            >
              <Avatar name={quote.user.name} uri={quote.user.avatarUrl} size={32} />
              <View style={{ flex: 1 }}>
                <Text variant="smallStrong" numberOfLines={1}>
                  {quote.user.name}
                </Text>
                <Text variant="caption" color="fgSubtle" weight="400" style={{ letterSpacing: 0 }}>
                  {formatRelative(quote.createdAt, locale)}
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: quote.isLiked }}
              accessibilityLabel={t('quote.likes', { count: quote.likesCount })}
              hitSlop={8}
              onPress={() => onLike?.(!quote.isLiked)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
            >
              <Heart
                size={19}
                color={quote.isLiked ? theme.colors.danger : theme.colors.fgMuted}
                fill={quote.isLiked ? theme.colors.danger : 'transparent'}
              />
              <Text variant="smallStrong" color={quote.isLiked ? 'danger' : 'fgMuted'}>
                {formatCount(quote.likesCount)}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('quote.comments', { count: quote.commentsCount })}
              hitSlop={8}
              onPress={onComment ?? open}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
            >
              <MessageCircle size={19} color={theme.colors.fgMuted} />
              <Text variant="smallStrong" color="fgMuted">
                {formatCount(quote.commentsCount)}
              </Text>
            </Pressable>

            <Pressable accessibilityRole="button" accessibilityLabel={t('quote.share')} hitSlop={8} onPress={share}>
              <Share2 size={18} color={theme.colors.fgMuted} />
            </Pressable>

            {onMore ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.showMore')}
                hitSlop={8}
                onPress={onMore}
              >
                <MoreHorizontal size={18} color={theme.colors.fgMuted} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
