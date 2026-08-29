import { createInertiaApp } from '@inertiajs/react'
import { InertiaProgress } from '@inertiajs/progress'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../css/app.css';

const queryClient = new QueryClient()

createInertiaApp({
    title: (title) => `${title ? `${title} | ` : ''}Admission - Opol Community College`,
    resolve: name => {
        const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true })
        return pages[`./Pages/${name}.jsx`]
    },
    setup({ el, App, props }) {
        createRoot(el).render(
            <QueryClientProvider client={queryClient}>
                <App {...props} />
            </QueryClientProvider>
        )
    },
})

// Top loader + spinner for Inertia navigations
InertiaProgress.init({
    delay: 100,
    color: '#7C3AED',
    includeCSS: true,
    showSpinner: false, // enable spinner in the top-right
})