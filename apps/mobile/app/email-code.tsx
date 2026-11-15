import { EMAIL_CODE_LENGTH } from '@compound/contracts';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import Animated, { LayoutAnimationConfig, useReducedMotion } from 'react-native-reanimated';

import { authClient } from '../src/auth/authClient.ts';
import { requestEmailCode, verifyEmailCode } from '../src/auth/emailCode.ts';
import { answerFrom } from '../src/auth/serverAnswer.ts';
import { Button } from '../src/components/Button.tsx';
import { noticeMotion, stepEntering, stepExiting, titleEntering } from '../src/motion/layoutAnimations.ts';
import { brand, layout, radius, space, type } from '../src/theme/tokens.ts';
import { useAppearance } from '../src/theme/useAppearance.ts';

type Step = { kind: 'email' } | { kind: 'code'; email: string };

type Notice = 'invalid-email' | 'send-failed' | 'code-refused' | 'rate-limited' | 'verify-failed';

const NOTICES: Record<Notice, string> = {
  'invalid-email': 'Enter a full email address, like name@example.com.',
  'send-failed': "Couldn't send a code. Try again.",
  'code-refused': "That code didn't work. Ask for a new one.",
  'rate-limited': 'Too many tries. Wait a minute, then try again.',
  'verify-failed': "Couldn't check the code. Try again.",
};

export default function EmailCode() {
  const { scheme, palette } = useAppearance();
  const [step, setStep] = useState<Step>({ kind: 'email' });
  const [text, setText] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const reduceMotion = useReducedMotion();
  const { entering, exiting, layout: slide } = noticeMotion();

  // A notice stays up while a retry runs and is only replaced by the result: clearing it first
  // would slide the buttons up and back down when the retry fails with the same notice.
  const sendCode = async () => {
    setBusy(true);

    const outcome = await requestEmailCode({
      email: text,
      sendCode: async (email) => answerFrom(await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' })),
    });

    setBusy(false);

    if (outcome.kind === 'sent') {
      setStep({ kind: 'code', email: outcome.email });
      setText('');
      setNotice(null);
    } else {
      setNotice(
        outcome.kind === 'invalid-email' ? 'invalid-email' : outcome.kind === 'rate-limited' ? 'rate-limited' : 'send-failed',
      );
    }
  };

  const checkCode = async (email: string) => {
    setBusy(true);

    const outcome = await verifyEmailCode({
      email,
      code: text,
      verifyCode: async (address, otp) => answerFrom(await authClient.signIn.emailOtp({ email: address, otp })),
    });

    setBusy(false);

    if (outcome.kind === 'refused') {
      setNotice('code-refused');
    } else if (outcome.kind === 'rate-limited') {
      setNotice('rate-limited');
    } else if (outcome.kind === 'failed') {
      setNotice('verify-failed');
    }
  };

  const restart = () => {
    setStep({ kind: 'email' });
    setText('');
    setNotice(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: brand.signInField[scheme] }]}
    >
      {/* The first step arrives with the screen's own transition, so only later steps animate in. */}
      <LayoutAnimationConfig skipEntering>
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
        >
          <Animated.Text
            key={`title-${step.kind}`}
            entering={titleEntering}
            exiting={stepExiting}
            style={[type.title2, { color: palette.label }]}
          >
            {step.kind === 'email' ? 'Sign in with an email code' : 'Enter your code'}
          </Animated.Text>
          <Animated.View
            key={`body-${step.kind}`}
            entering={stepEntering(reduceMotion)}
            exiting={stepExiting}
            style={styles.stepBody}
          >
            <Text style={[type.body, { color: palette.secondary }]}>
              {step.kind === 'email' ? "We'll email you a code. No password needed." : `We sent a code to ${step.email}.`}
            </Text>
            {step.kind === 'email' ? (
              <TextInput
                accessibilityLabel="Email address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                autoFocus
                keyboardType="email-address"
                onChangeText={setText}
                onSubmitEditing={sendCode}
                placeholder="name@example.com"
                placeholderTextColor={palette.secondary}
                returnKeyType="send"
                style={[styles.input, type.body, { backgroundColor: palette.card, color: palette.label }]}
                textContentType="emailAddress"
                value={text}
              />
            ) : (
              <TextInput
                accessibilityLabel="Sign-in code"
                autoComplete="one-time-code"
                autoFocus
                keyboardType="number-pad"
                maxLength={EMAIL_CODE_LENGTH}
                onChangeText={(value) => setText(value.replace(/[^0-9]/g, ''))}
                style={[styles.input, type.body, styles.code, { backgroundColor: palette.card, color: palette.label }]}
                textContentType="oneTimeCode"
                value={text}
              />
            )}
          </Animated.View>
          {notice === null ? null : (
            <Animated.Text
              key={notice}
              accessibilityRole="alert"
              entering={entering}
              exiting={exiting}
              style={[type.subheadline, styles.notice, { color: palette.danger }]}
            >
              {NOTICES[notice]}
            </Animated.Text>
          )}
          <Animated.View layout={slide}>
            <Button
              palette={palette}
              label={step.kind === 'email' ? 'Send code' : 'Sign in'}
              busy={busy}
              disabled={step.kind === 'email' ? text.trim() === '' : text.length !== EMAIL_CODE_LENGTH}
              onPress={step.kind === 'email' ? sendCode : () => checkCode(step.email)}
            />
          </Animated.View>
          {step.kind === 'code' ? (
            <Animated.View layout={slide}>
              <Button palette={palette} variant="quiet" label="Use a different email" disabled={busy} onPress={restart} />
            </Animated.View>
          ) : null}
        </ScrollView>
      </LayoutAnimationConfig>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  stepBody: { gap: space.lg },
  notice: { textAlign: 'center' },
  content: { flexGrow: 1, gap: space.lg, paddingHorizontal: layout.screenMargin, paddingTop: space.xxl },
  input: { minHeight: layout.buttonHeight, borderRadius: radius.field, paddingHorizontal: space.lg },
  code: { fontVariant: ['tabular-nums'], letterSpacing: 4, textAlign: 'center' },
});
