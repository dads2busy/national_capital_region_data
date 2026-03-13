'use client'

import './globals.css'
import { ThemeProvider } from 'next-themes'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Lato, Source_Serif_4 } from 'next/font/google'

const lato = Lato({ subsets: ['latin'], weight: ['300', '400', '700'], variable: '--font-lato' })
const sourceSerif = Source_Serif_4({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-heading' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${lato.variable} ${sourceSerif.variable}`}>
      <head>
        <link rel="icon" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon.png`} />
        <title>National Capital Region Data Commons</title>
        <meta name="description" content="National Capital Region Health Data Dashboard" />
      </head>
      <body className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          <NuqsAdapter>{children}</NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  )
}
