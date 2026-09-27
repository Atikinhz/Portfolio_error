import type {Metadata} from 'next';
import {Manrope, Anybody, Instrument_Serif, JetBrains_Mono} from 'next/font/google';
import './globals.css'; // Global styles
import {GlobalElasticCursor} from '@/components/global-elastic-cursor';
import {ThirdPartyExtensionGuard} from '@/components/third-party-extension-guard';

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-manrope',
  weight: ['200', '300', '400', '500', '600', '700', '800'],
});

const anybody = Anybody({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-anybody',
  weight: ['700', '800', '900'],
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif-italic',
  weight: ['400'],
  style: ['normal', 'italic'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono-tech',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Nikita Zhorov — Product & Marketing Designer',
  description: 'Personal portfolio of Nikita Zhorov, Product & Marketing Designer based in Chemnitz, Germany.',
  openGraph: {
    title: 'Nikita Zhorov — Product & Marketing Designer',
    description: 'Personal portfolio of Nikita Zhorov, Product & Marketing Designer based in Chemnitz, Germany.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nikita Zhorov — Product & Marketing Designer',
    description: 'Personal portfolio of Nikita Zhorov, Product & Marketing Designer based in Chemnitz, Germany.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${anybody.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <head suppressHydrationWarning>
        <link rel="preload" as="image" href="/assets/portrait.png?v=2" />
        <link rel="preload" as="image" href="/assets/work_uiux.png" />
        <link rel="preload" as="image" href="/assets/work_brand.png" />
        <link rel="preload" as="image" href="/assets/work_marketing.png" />
        <link rel="preload" as="image" href="/assets/zip_hero.png" />
        <link rel="preload" as="image" href="/assets/vrak/crush_can.png" />
        <link rel="preload" as="image" href="/assets/vrak/zip_can.png" />
        <link rel="preload" as="image" href="/assets/vrak/twist_can.png" />
      </head>
      <body className="bg-[var(--bg)] text-[var(--text)] font-sans antialiased selection:bg-[var(--text)] selection:text-[var(--surface)]" suppressHydrationWarning>
        {/* Intercept early window.ethereum injection & extension unhandled rejections prior to React hydration */}
        <script
          id="early-extension-guard"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function shouldSuppress(msg) {
                  if (!msg) return false;
                  var str = typeof msg === 'string' ? msg : (msg.message || msg.stack || '' + msg);
                  return /MetaMask|ethereum|inpage|chrome-extension|moz-extension|web3/i.test(str);
                }

                window.addEventListener('unhandledrejection', function(event) {
                  if (event && shouldSuppress(event.reason)) {
                    event.preventDefault();
                    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
                  }
                }, true);

                window.addEventListener('error', function(event) {
                  if (event && (shouldSuppress(event.message) || shouldSuppress(event.filename))) {
                    event.preventDefault();
                    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
                  }
                }, true);

                // Define dummy non-throwing ethereum provider if extension or script checks it
                try {
                  if (typeof window.ethereum === 'undefined') {
                    var noop = function() { return Promise.resolve([]); };
                    var dummyProvider = {
                      isMetaMask: true,
                      request: function(args) {
                        if (args && args.method === 'eth_accounts') return Promise.resolve([]);
                        if (args && args.method === 'eth_requestAccounts') return Promise.resolve([]);
                        return Promise.resolve(null);
                      },
                      sendAsync: function(payload, cb) { if (typeof cb === 'function') cb(null, { result: [] }); },
                      send: function(method) { return Promise.resolve([]); },
                      on: function() {},
                      removeListener: function() {},
                      addListener: function() {},
                      enable: noop
                    };
                    Object.defineProperty(window, 'ethereum', {
                      value: dummyProvider,
                      writable: true,
                      configurable: true
                    });
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        <ThirdPartyExtensionGuard />
        <GlobalElasticCursor />
        {children}
      </body>
    </html>
  );
}
