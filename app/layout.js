"use client";

import "./globals.scss";

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Cun Bo - Học Vui, Học Thật</title>
        <meta name="description" content="Nền tảng học tập tương tác dành cho học sinh tiểu học. Học Toán, Khoa Học, Tiếng Anh một cách vui nhộn và hiệu quả." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
