import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
      },
      {
        title: '애객 맛집 지도',
      },
      {
        name: 'description',
        content: '전국 맛집 지도 - 애객이 엄선한 맛집을 지도에서 한눈에 찾아보세요.',
      },
      {
        name: 'keywords',
        content: '맛집, 맛집 지도, 전국 맛집, 맛집 추천, 맛집 검색, 음식점, 식당, 애객',
      },
      {
        name: 'theme-color',
        content: '#f97316',
      },
      {
        property: 'og:title',
        content: '애객 맛집 지도',
      },
      {
        property: 'og:description',
        content: '전국 맛집 지도 - 애객이 엄선한 맛집을 지도에서 한눈에 찾아보세요.',
      },
      {
        property: 'og:image',
        content: 'https://aagag.matjip.site/og-image.png',
      },
      {
        property: 'og:url',
        content: 'https://aagag.matjip.site',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:locale',
        content: 'ko_KR',
      },
      {
        property: 'og:site_name',
        content: '애객 맛집 지도',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: '애객 맛집 지도',
      },
      {
        name: 'twitter:description',
        content: '전국 맛집 지도 - 애객이 엄선한 맛집을 지도에서 한눈에 찾아보세요.',
      },
      {
        name: 'twitter:image',
        content: 'https://aagag.matjip.site/og-image.png',
      },
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
      },
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'canonical',
        href: 'https://aagag.matjip.site',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <HeadContent />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-NRVS66TPF6" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-NRVS66TPF6');`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
