import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bot, RotateCcw, Send } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAssistantChat, useAssistantStatus, type AssistantMessage } from '@/api/hooks';
import { AppHeader } from '@/components/layout/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

const MAX_LENGTH = 2000;

function Bubble({ message }: { message: AssistantMessage }) {
  const theme = useTheme();
  const mine = message.role === 'user';
  return (
    <View
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '86%',
        paddingVertical: theme.spacing.sm + 2,
        paddingHorizontal: theme.spacing.md + 2,
        borderRadius: theme.radius.lg,
        borderBottomRightRadius: mine ? theme.radius.sm / 2 : theme.radius.lg,
        borderBottomLeftRadius: mine ? theme.radius.lg : theme.radius.sm / 2,
        backgroundColor: mine ? theme.colors.primary : theme.colors.card,
        borderWidth: mine ? 0 : 1,
        borderColor: theme.colors.border,
      }}
    >
      <Text selectable color={mine ? 'primaryFg' : 'fg'}>
        {message.content}
      </Text>
    </View>
  );
}

/**
 * A plain chat with the book assistant. The conversation lives only in this
 * screen's state: nothing is stored, and leaving the screen starts afresh.
 */
export default function AssistantScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const toast = useToast();
  const scrollRef = useRef<ScrollView>(null);

  const status = useAssistantStatus();
  const chat = useAssistantChat();

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState('');

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || chat.isPending) return;

    const next: AssistantMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setDraft('');

    try {
      const res = await chat.mutateAsync(next);
      if (!res.available) {
        void status.refetch();
        return;
      }
      setMessages([...next, { role: 'assistant', content: res.reply }]);
    } catch {
      // Put the question back so the reader can retry without retyping it.
      setMessages(messages);
      setDraft(content);
      toast.error(t('assistant.error'));
    }
  };

  const suggestions = [t('assistant.suggestion1'), t('assistant.suggestion2'), t('assistant.suggestion3')];

  return (
    <>
      <AppHeader
        back
        title={t('assistant.title')}
        subtitle={t('assistant.subtitle')}
        right={
          messages.length > 0 ? (
            <IconButton
              label={t('assistant.clear')}
              onPress={() => {
                setMessages([]);
                setDraft('');
              }}
            >
              <RotateCcw size={18} color={theme.colors.fgMuted} />
            </IconButton>
          ) : undefined
        }
      />

      {status.isLoading ? (
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
          <Skeleton height={72} radius={theme.radius.lg} />
          <Skeleton height={44} width="60%" radius={theme.radius.lg} />
        </View>
      ) : !status.data?.available ? (
        <View style={{ flex: 1, justifyContent: 'center', padding: theme.spacing.lg }}>
          <EmptyState
            icon={<Bot size={22} color={theme.colors.fgSubtle} />}
            title={t('assistant.unavailableTitle')}
            hint={t('assistant.unavailableHint')}
          />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollRef}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              gap: theme.spacing.md,
              padding: theme.spacing.lg,
              width: '100%',
              maxWidth: theme.layout.maxContentWidth,
              alignSelf: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-end' }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={18} color={theme.colors.primarySoftFg} />
              </View>
              <View style={{ flex: 1 }}>
                <Bubble message={{ role: 'assistant', content: t('assistant.greeting') }} />
              </View>
            </View>

            {messages.length === 0 ? (
              <View style={{ gap: theme.spacing.sm, alignItems: 'flex-end' }}>
                {suggestions.map((s) => (
                  <Pressable
                    key={s}
                    accessibilityRole="button"
                    onPress={() => void send(s)}
                    style={({ pressed }) => ({
                      paddingVertical: theme.spacing.sm,
                      paddingHorizontal: theme.spacing.md,
                      borderRadius: theme.radius.pill,
                      borderWidth: 1.5,
                      borderColor: theme.colors.primary,
                      backgroundColor: pressed ? theme.colors.primarySoft : 'transparent',
                      maxWidth: '90%',
                    })}
                  >
                    <Text variant="smallStrong" color="primary">
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {messages.map((m, i) => (
              <Bubble key={i} message={m} />
            ))}

            {chat.isPending ? (
              <Text variant="small" color="fgSubtle" style={{ marginLeft: theme.spacing.xs }}>
                {t('assistant.thinking')}
              </Text>
            ) : null}
          </ScrollView>

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              paddingHorizontal: theme.spacing.md,
              paddingTop: theme.spacing.sm,
              paddingBottom: Math.max(insets.bottom, theme.spacing.md),
              gap: theme.spacing.xs,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Input
                containerStyle={{ flex: 1 }}
                value={draft}
                onChangeText={(v) => setDraft(v.slice(0, MAX_LENGTH))}
                placeholder={t('assistant.placeholder')}
                onSubmitEditing={() => void send(draft)}
                returnKeyType="send"
                accessibilityLabel={t('assistant.placeholder')}
              />
              <IconButton
                label={t('assistant.send')}
                variant="subtle"
                size={46}
                disabled={!draft.trim() || chat.isPending}
                onPress={() => void send(draft)}
              >
                <Send size={18} color={theme.colors.primary} />
              </IconButton>
            </View>
            <Text variant="caption" color="fgSubtle" weight="400" center style={{ letterSpacing: 0 }}>
              {t('assistant.disclaimer')}
            </Text>
          </View>
        </KeyboardAvoidingView>
      )}
    </>
  );
}
