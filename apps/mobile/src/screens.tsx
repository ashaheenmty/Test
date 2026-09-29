import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import type { ThemePreference } from '@tb/domain';
import { formatDate, LOCALES, SUPPORTED_LOCALES, type SupportedLocale } from '@tb/i18n';
import { spacing } from '@tb/ui';
import { api, ApiError } from './api';
import { useApp } from './app-context';
import { Alert, Body, Button, Card, Chip, Field, Heading, s } from './components';

function useErrorText() {
  const { t } = useApp();
  return (e: unknown) => {
    const code = e instanceof ApiError ? e.code : 'common.errorGeneric';
    const msg = t(code);
    return msg === code ? t('common.errorGeneric') : msg;
  };
}

function Screen({ children }: { children: React.ReactNode }) {
  const { c } = useApp();
  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function LanguagePicker({ value, onChange }: { value: SupportedLocale; onChange: (l: SupportedLocale) => void }) {
  return (
    <View accessibilityRole="radiogroup" style={s.row}>
      {SUPPORTED_LOCALES.map((l) => (
        <Chip key={l} label={LOCALES[l].nativeName} selected={value === l} onPress={() => onChange(l)} />
      ))}
    </View>
  );
}

export function OnboardingScreen() {
  const { t, locale, setLocale } = useApp();
  const [choice, setChoice] = useState(locale);
  return (
    <Screen>
      <Heading>{t('onboarding.welcome')}</Heading>
      <Body muted>{t('onboarding.tagline')}</Body>
      <Card>
        <Heading level={2}>{t('onboarding.chooseLanguage')}</Heading>
        <LanguagePicker value={choice} onChange={setChoice} />
      </Card>
      <Card>
        <Body>{t('onboarding.agentNotice')}</Body>
      </Card>
      <Button variant="primary" label={t('onboarding.getStarted')} onPress={() => void setLocale(choice)} />
    </Screen>
  );
}

export function AuthScreen() {
  const { t, locale, refreshMe } = useApp();
  const errorText = useErrorText();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (mode === 'register' && !accepted) return setError(t('auth.mustAcceptTerms'));
    setBusy(true);
    try {
      if (mode === 'login') await api.login(email.trim(), password);
      else {
        const v = await api.legalVersions(locale);
        await api.register({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          locale,
          acceptedAgentTermsVersion: v.AGENT_TERMS.version,
          acceptedPrivacyPolicyVersion: v.PRIVACY_POLICY.version,
        });
      }
      await refreshMe();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Heading>{mode === 'login' ? t('auth.signInTitle') : t('auth.registerTitle')}</Heading>
      <Alert text={error} kind="error" />
      <Card>
        {mode === 'register' ? (
          <>
            <Field label={t('auth.firstName')} value={firstName} onChangeText={setFirstName} autoComplete="given-name" textContentType="givenName" />
            <Field label={t('auth.lastName')} value={lastName} onChangeText={setLastName} autoComplete="family-name" textContentType="familyName" />
          </>
        ) : null}
        <Field
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Field
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          textContentType={mode === 'login' ? 'password' : 'newPassword'}
        />
        {mode === 'register' ? (
          <>
            <Body muted>{t('auth.passwordHint')}</Body>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: accepted }}
              onPress={() => setAccepted((v) => !v)}
              style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center', minHeight: 48 }}
            >
              <Switch value={accepted} onValueChange={setAccepted} accessibilityElementsHidden importantForAccessibility="no" />
              <Body style={{ flex: 1 }}>{t('auth.acceptTerms')}</Body>
            </Pressable>
          </>
        ) : null}
        <Button
          variant="primary"
          disabled={busy}
          label={mode === 'login' ? t('auth.submitSignIn') : t('auth.submitRegister')}
          onPress={() => void submit()}
        />
        {/* Native Sign in with Apple / Google need provider client IDs (open decision); API support exists. */}
        <Button label={t('auth.continueWithApple')} disabled onPress={() => undefined} />
        <Button label={t('auth.continueWithGoogle')} disabled onPress={() => undefined} />
      </Card>
      <Button
        variant="quiet"
        label={mode === 'login' ? `${t('auth.noAccount')} ${t('auth.registerTitle')}` : `${t('auth.haveAccount')} ${t('nav.signIn')}`}
        onPress={() => {
          setError(null);
          setMode(mode === 'login' ? 'register' : 'login');
        }}
      />
    </Screen>
  );
}

export function HomeScreen() {
  const { t, me, locale } = useApp();
  return (
    <Screen>
      <Heading>{me?.firstName ? t('profile.greeting', { name: me.firstName }) : t('home.title')}</Heading>
      <Card>
        <Heading level={2}>{t('home.title')}</Heading>
        <Field label={t('home.from')} placeholder="Berlin Hbf" />
        <Field label={t('home.to')} placeholder="München Hbf" />
        <Body muted>{t('home.passengers', { count: 1 })}</Body>
        <Button variant="primary" label={t('home.search')} disabled onPress={() => undefined} />
        <Body muted>{t('home.searchComingSoon')}</Body>
      </Card>
      <Card>
        <Heading level={2}>{t('home.upcomingTitle')}</Heading>
        <Body muted>{t('home.upcomingEmpty')}</Body>
        <Body muted>{formatDate(new Date(), locale, { dateStyle: 'full' })}</Body>
      </Card>
    </Screen>
  );
}

export function BookingsScreen() {
  const { t } = useApp();
  return (
    <Screen>
      <Heading>{t('bookings.title')}</Heading>
      <Card>
        <Body muted>{t('bookings.empty')}</Body>
      </Card>
    </Screen>
  );
}

type Passenger = Awaited<ReturnType<typeof api.passengers>>[number];

export function ProfileScreen() {
  const { t, me, locale, setLocale, theme, setTheme, setMe } = useApp();
  const errorText = useErrorText();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [msg, setMsg] = useState<{ text: string; kind: 'error' | 'success' } | null>(null);

  const load = useCallback(async () => {
    setPassengers(await api.passengers().catch(() => []));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    try {
      await api.addPassenger({ firstName: first.trim(), lastName: last.trim() });
      setFirst('');
      setLast('');
      setMsg({ text: t('profile.saved'), kind: 'success' });
      await load();
    } catch (e) {
      setMsg({ text: errorText(e), kind: 'error' });
    }
  };

  return (
    <Screen>
      <Heading>{me?.firstName ? t('profile.greeting', { name: me.firstName }) : t('profile.title')}</Heading>
      <Alert text={msg?.text ?? null} kind={msg?.kind ?? 'success'} />
      <Card>
        <Heading level={2}>{t('profile.personalData')}</Heading>
        <Body>{me?.email}</Body>
        {!me?.emailVerified ? <Body muted>{t('profile.emailNotVerified')}</Body> : null}
      </Card>
      <Card>
        <Heading level={2}>{t('profile.passengers')}</Heading>
        {passengers.map((p) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}>
            <Body style={{ fontWeight: '600', flex: 1 }}>
              {p.firstName} {p.lastName}
            </Body>
            {!p.isAccountHolder ? (
              <Button variant="quiet" label={t('common.delete')} onPress={() => void api.deletePassenger(p.id).then(load)} />
            ) : null}
          </View>
        ))}
        <Field label={t('auth.firstName')} value={first} onChangeText={setFirst} />
        <Field label={t('auth.lastName')} value={last} onChangeText={setLast} />
        <Button label={t('profile.addPassenger')} onPress={() => void add()} disabled={!first.trim() || !last.trim()} />
      </Card>
      <Card>
        <Heading level={2}>{t('common.language')}</Heading>
        <LanguagePicker value={locale} onChange={(l) => void setLocale(l)} />
      </Card>
      <Card>
        <Heading level={2}>{t('theme.label')}</Heading>
        <View accessibilityRole="radiogroup" style={s.row}>
          {(['SYSTEM', 'LIGHT', 'DARK'] as ThemePreference[]).map((v) => (
            <Chip key={v} label={t(`theme.${v.toLowerCase()}`)} selected={theme === v} onPress={() => void setTheme(v)} />
          ))}
        </View>
      </Card>
      <Button
        label={t('nav.signOut')}
        onPress={() => {
          void api.logout().then(() => setMe(null));
        }}
      />
    </Screen>
  );
}
