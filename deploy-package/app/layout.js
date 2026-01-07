import './globals.css'

export const metadata = {
  title: 'Project Planner',
  description: 'Team project planning tool with Gantt charts, dependencies, and collaboration',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
