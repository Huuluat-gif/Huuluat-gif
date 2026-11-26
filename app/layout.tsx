import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Lowf — Quản trị thư viện',
  description: 'Không gian quản trị sách, âm nhạc, video và giao diện Lowf.',
  icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="vi"><body style={{margin:0}}>{children}</body></html>;
}
