import { createInertiaApp } from '@inertiajs/react'
import { InertiaProgress } from '@inertiajs/progress'
import { createRoot } from 'react-dom/client'
import '../css/app.css';

createInertiaApp({
  resolve: name => {
    const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true })
    return pages[`./Pages/${name}.jsx`]
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },
})

// Top loader + spinner for Inertia navigations
InertiaProgress.init({
  delay: 100,
  color: '#7C3AED',
  includeCSS: true,
  showSpinner: true, // enable spinner in the top-right
})