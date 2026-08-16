import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth';
import { usePrefs } from '@/store/prefs';
import * as validate from '@/lib/validation';
import { useGoogleAuth } from '@/lib/googleAuth';
import { errorMessageKey } from '@/api/errors';
import { useToast } from '@/components/ui/Toast';
import { AuthHeader, SocialButtons } from '@/components/auth/AuthParts';
import { View, Image, StyleSheet } from 'react-native';

export default function LoginWeb() {
  const router = useRouter();
  const theme = useTheme();

  // Language
  const { t, locale, setLocale } = useI18n();

  const toast = useToast();

  const login = useAuth((s) => s.login);
  const loginWithProvider = useAuth((s) => s.loginWithProvider);
  const onboardingDone = usePrefs((s) => s.onboardingDone);
  const { signIn: googleSignIn } = useGoogleAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const next = {
      email: validate.email(email),
      password: validate.password(password),
    };

    if (!validate.isValid(next)) {
      setStatus('Please check your email and password');
      return;
    }

    setBusy(true);

    try {
      await login(email.trim(), password);

      router.replace(onboardingDone ? '/' : '/onboarding');
    } catch (err) {
      toast.error(t(errorMessageKey(err)));
    } finally {
      setBusy(false);
    }
  };

  const social = async (
    provider: 'google' | 'apple' | 'facebook'
  ) => {
    if (provider !== 'google') return;

    setBusy(true);

    try {
      const result = await googleSignIn();

      if (!result) return;

      await loginWithProvider('google', result.idToken);

      router.replace(onboardingDone ? '/' : '/onboarding');
    } catch (err) {
      toast.error(t(errorMessageKey(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.page}>

      {/* =========================
          GLOBAL WEB CSS
      ========================== */}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root {
              --ink: #142a4a;
              --blue: #3478ea;
              --mist: #eaf4ff;
              --line: #dbeafe;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body,
            #root {
              margin: 0;
              padding: 0;
              min-height: 100%;
              width: 100%;
            }

            body {
              font-family:
                Inter,
                system-ui,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                Roboto,
                Arial,
                sans-serif;
              color: var(--ink);
            }

            input {
              font-family: inherit;
            }

            button {
              font-family: inherit;
            }

            /* =========================
               MAIN GRID
            ========================== */

            .kitab-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              min-height: 100vh;
              width: 100%;
            }

            /* =========================
               LEFT BOOK SIDE
            ========================== */

            .visual-side {
              position: relative;
              overflow: hidden;
              padding: 48px;
              background:
                linear-gradient(
                  145deg,
                  #fafdff 0%,
                  #eff7ff 57%,
                  #e0efff 100%
                );
            }

            /* =========================
               RIGHT LOGIN SIDE
            ========================== */

            .panel-side {
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 40px;
              background:
                linear-gradient(
                  145deg,
                  #ffffff,
                  #fbfdff 68%,
                  #f1f8ff
                );
            }

            /* =========================
               LANGUAGE SWITCHER
            ========================== */

            .language-switcher {
              position: absolute;
              top: 28px;
              right: 36px;

              display: flex;
              align-items: center;

              gap: 8px;

              z-index: 100;
            }

            .language-btn {
              background: transparent;
              border: none;

              color: #64748b;

              font-size: 13px;
              font-weight: 600;

              cursor: pointer;

              padding: 6px 4px;

              transition:
                color 0.2s ease,
                opacity 0.2s ease;
            }

            .language-btn:hover {
              color: #2563eb;
            }

            .language-btn.active {
              color: #2563eb;
              font-weight: 700;
            }

            .language-divider {
              color: #cbd5e1;
              font-size: 13px;
            }

            /* =========================
               AUTH CARD
            ========================== */

            .auth-card {
              width: min(100%, 460px);

              padding: 40px;

              border-radius: 30px;

              background: rgba(255, 255, 255, 0.92);

              border: 1px solid
                rgba(192, 219, 249, 0.85);

              box-shadow:
                0 24px 70px
                rgba(47, 102, 165, 0.12);
            }

            .header-row {
              display: flex;
              align-items: center;
              margin-bottom: 8px;
            }

            .auth-title {
              font-family:
                Fraunces,
                Georgia,
                serif;

              font-size: 28px;

              margin: 8px 0;
            }

            .auth-sub {
              color: #1f2d44;
              opacity: 0.8;
              margin-bottom: 18px;
            }

            /* =========================
               INPUTS
            ========================== */

            .input {
              width: 100%;

              padding: 14px 16px;

              border-radius: 20px;

              border: 1px solid #cfdef1;

              background:
                rgba(248, 252, 255, 0.88);

              margin-top: 6px;

              font-size: 15px;

              color: #142a4a;

              outline: none;
            }

            .input:focus {
              border-color: #4b8cf0;

              box-shadow:
                0 0 0 4px
                rgba(74, 145, 244, 0.13);

              background: #ffffff;
            }

            /* =========================
               FORM
            ========================== */

            .form-row {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            /* =========================
               LOGIN BUTTON
            ========================== */

            .primary-btn {
              display: flex;

              align-items: center;
              justify-content: center;

              background:
                linear-gradient(
                  145deg,
                  #4a91f4,
                  #2165cd
                );

              color: white;

              padding: 12px 18px;

              border-radius: 18px;

              border: none;

              font-weight: 700;

              width: 100%;

              cursor: pointer;

              font-size: 15px;

              min-height: 48px;

              margin-top: 4px;
            }

            .primary-btn:hover {
              opacity: 0.95;
            }

            .primary-btn:disabled {
              opacity: 0.6;
              cursor: default;
            }

            /* =========================
               FORGOT PASSWORD
            ========================== */

            .link-row {
              display: flex;

              justify-content: flex-end;

              align-items: center;

              margin-top: 4px;
            }

            .link-row a {
              font-size: 13px;

              color: #2563eb;

              text-decoration: none;
            }

            .link-row a:hover {
              text-decoration: underline;
            }

            /* =========================
               STATUS
            ========================== */

            .status {
              min-height: 22px;

              margin-top: 12px;

              text-align: center;

              color: #3478ea;

              font-size: 13px;
            }

            /* =========================
               REGISTER
            ========================== */

            .register-link {
              color: #2563eb;

              font-weight: 700;

              text-decoration: none;
            }

            .register-link:hover {
              text-decoration: underline;
            }

            /* =========================
               DECORATIVE ORBS
            ========================== */

            .orb {
              position: absolute;

              border-radius: 999px;

              filter: blur(12px);

              pointer-events: none;
            }

            .orb.one {
              width: 220px;
              height: 220px;

              top: -80px;
              right: -60px;

              background:
                rgba(146, 204, 255, 0.5);
            }

            .orb.two {
              width: 180px;
              height: 180px;

              bottom: -70px;
              left: -70px;

              background:
                rgba(107, 166, 247, 0.22);
            }

            /* =========================
               MOBILE
            ========================== */

            @media (max-width: 900px) {

              .kitab-grid {
                grid-template-columns: 1fr;
              }

              .visual-side {
                display: none;
              }

              .panel-side {
                min-height: 100vh;
                padding: 20px;
              }

              .auth-card {
                padding: 28px 22px;
              }

              .language-switcher {
                top: 18px;
                right: 20px;
              }
            }
          `,
        }}
      />

      {/* =========================
          MAIN LOGIN LAYOUT
      ========================== */}

      <View style={styles.htmlWrapper}>

        <main className="kitab-grid">

          {/* =========================
              LEFT — BOOKS
          ========================== */}

          <section
            className="visual-side"
            aria-hidden="true"
          >

            <div className="orb one" />
            <div className="orb two" />

            <View style={styles.bookScene}>

              {/* BOOK 1 */}

              <Image
                source={require('../../assets/images/books/book-1.jpg')}
                style={[
                  styles.bookObject,
                  styles.bookOne,
                ]}
                resizeMode="cover"
              />

              {/* BOOK 2 */}

              <Image
                source={require('../../assets/images/books/book-2.jpg')}
                style={[
                  styles.bookObject,
                  styles.bookTwo,
                ]}
                resizeMode="cover"
              />

              {/* BOOK 3 */}

              <Image
                source={require('../../assets/images/books/book-3.jpg')}
                style={[
                  styles.bookObject,
                  styles.bookThree,
                ]}
                resizeMode="cover"
              />

              {/* BOOK 4 */}

              <Image
                source={require('../../assets/images/books/book-4.jpg')}
                style={[
                  styles.bookObject,
                  styles.bookFour,
                ]}
                resizeMode="cover"
              />

              {/* BOOK 5 */}

              <Image
                source={require('../../assets/images/books/book-5.jpg')}
                style={[
                  styles.bookObject,
                  styles.bookFive,
                ]}
                resizeMode="cover"
              />

            </View>

          </section>

          {/* =========================
              RIGHT — LOGIN
          ========================== */}

          <section className="panel-side">

            {/* =========================
                LANGUAGE SWITCHER
            ========================== */}

            <div className="language-switcher">

              <button
                type="button"
                className={
                  locale === 'en'
                    ? 'language-btn active'
                    : 'language-btn'
                }
                onClick={() => setLocale('en')}
              >
                English
              </button>

              <span className="language-divider">
                |
              </span>

              <button
                type="button"
                className={
                  locale === 'az'
                    ? 'language-btn active'
                    : 'language-btn'
                }
                onClick={() => setLocale('az')}
              >
                Azərbaycan
              </button>

            </div>

            {/* =========================
                AUTH CARD
            ========================== */}

            <div className="auth-card">

              <header className="header-row">
                <div />
              </header>

              <AuthHeader
                title={t('auth.welcomeTitle')}
                subtitle={t('auth.welcomeSubtitle')}
              />

              <form
                onSubmit={submit}
                style={{ marginTop: 18 }}
              >

                <div className="form-row">

                  {/* EMAIL */}

                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {t('auth.email')}
                  </label>

                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setStatus('');
                    }}
                    placeholder="ad@example.com"
                    autoComplete="email"
                  />

                  {/* PASSWORD */}

                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      marginTop: 6,
                    }}
                  >
                    {t('auth.password')}
                  </label>

                  <input
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setStatus('');
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />

                  {/* FORGOT PASSWORD */}

                  <div className="link-row">

                    <a href="/forgot-password">
                      {t('auth.forgotPassword')}
                    </a>

                  </div>

                  {/* LOGIN */}

                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={busy}
                  >
                    {busy
                      ? 'Signing in...'
                      : t('auth.login')}
                  </button>

                  {/* STATUS */}

                  <div className="status">
                    {status}
                  </div>

                  {/* DEMO HINT */}

                  <div
                    style={{
                      textAlign: 'center',
                      color: '#64748b',
                      fontSize: 13,
                    }}
                  >
                    {t('auth.demoHint')}
                  </div>

                  {/* GOOGLE */}

                  <div>
                    <SocialButtons
                      onPress={() =>
                        social('google')
                      }
                      disabled={busy}
                    />
                  </div>

                  {/* REGISTER */}

                  <div
                    style={{
                      textAlign: 'center',
                      marginTop: 8,
                    }}
                  >

                    <span
                      style={{
                        color: '#64748b',
                      }}
                    >
                      {t('auth.noAccount')}
                    </span>

                    {' '}

                    <a
                      href="/register"
                      className="register-link"
                    >
                      {t('auth.register')}
                    </a>

                  </div>

                </div>

              </form>

            </div>

          </section>

        </main>

      </View>

    </View>
  );
}

/* =====================================================
   REACT NATIVE STYLES
===================================================== */

const styles = StyleSheet.create({

  /* =========================
     PAGE
  ========================== */

  page: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
    backgroundColor: '#ffffff',
  },

  htmlWrapper: {
    flex: 1,
    width: '100%',
  },

  /* =========================
     BOOK CONTAINER
  ========================== */

  bookScene: {
    width: '100%',
    maxWidth: 650,
    height: 560,
    position: 'relative',
    marginTop: 40,
    alignSelf: 'center',
  },

  /* =========================
     BASE BOOK
  ========================== */

  bookObject: {
    position: 'absolute',

    borderRadius: 8,

    overflow: 'hidden',

    shadowColor: '#124881',

    shadowOffset: {
      width: 0,
      height: 24,
    },

    shadowOpacity: 0.25,

    shadowRadius: 30,

    elevation: 10,
  },

  /* =========================
     BOOK 1
  ========================== */

  bookOne: {
    width: 150,
    height: 225,

    left: '6%',
    top: '7%',

    transform: [
      {
        rotate: '-16deg',
      },
    ],

    zIndex: 6,
  },

  /* =========================
     BOOK 2
  ========================== */

  bookTwo: {
    width: 177,
    height: 250,

    left: '35%',
    top: 0,

    transform: [
      {
        rotate: '8deg',
      },
    ],

    zIndex: 5,
  },

  /* =========================
     BOOK 3
  ========================== */

  bookThree: {
    width: 135,
    height: 200,

    right: '3%',
    top: '21%',

    transform: [
      {
        rotate: '17deg',
      },
    ],

    zIndex: 4,
  },

  /* =========================
     BOOK 4
  ========================== */

  bookFour: {
    width: 138,
    height: 210,

    left: '16%',
    bottom: 0,

    transform: [
      {
        rotate: '11deg',
      },
    ],

    zIndex: 3,
  },

  /* =========================
     BOOK 5
  ========================== */

  bookFive: {
    width: 144,
    height: 220,

    left: '47%',
    bottom: '3%',

    transform: [
      {
        rotate: '-11deg',
      },
    ],

    zIndex: 2,
  },

});