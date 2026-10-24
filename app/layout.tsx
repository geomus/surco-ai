import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Montserrat, Poppins } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-montserrat' })
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-poppins' })

export const metadata: Metadata = {
  title: 'Mi Campo · Tu campo, en un solo lugar',
  applicationName: 'Mi Campo',
  description:
    'Copiloto con IA para productores agropecuarios: cuándo entrar al lote, cuánto vender y la carpeta de seguro y financiación lista, desde una sola conversación.',
  generator: 'v0.app',
  icons: { icon: '/icon.svg' },
}

export const viewport: Viewport = {
  themeColor: '#0F5B31',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es-AR" className={`${montserrat.variable} ${poppins.variable} bg-background`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
