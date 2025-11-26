import { Link } from '@inertiajs/react';

export default function Welcome() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center px-4">
            <div className="bg-white/20 backdrop-blur-md border border-white/30 shadow-2xl rounded-2xl p-10 max-w-xl w-full text-center">
                <h1 className="text-5xl font-extrabold text-white mb-10 drop-shadow-lg">
                    👋 Welcome to Inertia + React + Tailwind
                </h1>
                <p className="text-lg text-white/90 mb-8">
                    This is a fully custom setup using <span className="font-semibold text-white">Laravel 12</span>, <span className="font-semibold text-white">Inertia.js</span>, <span className="font-semibold text-white">React 19</span>, and <span className="font-semibold text-white">Tailwind CSS 4</span>.
                </p>
                <p className="text-base text-white/80 mb-10 italic">
                    <span className="font-bold mb-100">Crafted by Althian James Baron.</span> <br />
                    To get started, open <span className="font-mono bg-white/10 px-2 py-1 rounded">C:\laragon\www\inertia\resources\js\pages</span> and make your modifications!
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                    <a
                        href="https://laravel.com/docs/12.x/releases"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2 bg-gradient-to-r from-red-400 to-pink-500 text-white font-semibold rounded-lg shadow-md hover:scale-105 transition-all duration-200"
                    >
                        Laravel 12 Docs
                    </a>
                    <a
                        href="https://inertiajs.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2 bg-gradient-to-r from-purple-400 to-indigo-500 text-white font-semibold rounded-lg shadow-md hover:scale-105 transition-all duration-200"
                    >
                        Inertia.js Docs
                    </a>
                    <a
                        href="https://react.dev/blog/2024/12/05/react-19"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2 bg-gradient-to-r from-blue-400 to-cyan-500 text-white font-semibold rounded-lg shadow-md hover:scale-105 transition-all duration-200"
                    >
                        React 19 Blog
                    </a>
                    <a
                        href="https://tailwindcss.com/docs/installation/using-vite"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2 bg-gradient-to-r from-green-400 to-teal-500 text-white font-semibold rounded-lg shadow-md hover:scale-105 transition-all duration-200"
                    >
                        Tailwind CSS 4 Docs
                    </a>

                    <Link
                        href="/test"
                          className="px-5 py-2 bg-gradient-to-r from-green-400 to-teal-500 text-white font-bold rounded-lg shadow-md hover:scale-105 transition-all duration-200"
                    >
                        Go to test
                    </Link>
                    <Link
                        href="/login"
                          className="px-5 py-2 bg-gradient-to-r from-purple-400 to-pink-500 text-white font-bold rounded-lg shadow-md hover:scale-105 transition-all duration-200"
                    >
                        Login
                    </Link>
                </div>
            </div>
        </div>
    );
}