export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#auth-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-indigo-700 focus:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        Skip to main content
      </a>
      <div id="auth-main-content" tabIndex={-1}>
        {children}
      </div>
    </>
  )
}
