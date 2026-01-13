/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                zafira: {
                    background: '#121214',
                    surface: '#202024',
                    highlight: '#8257e5',
                    success: '#04d361',
                    text: '#e1e1e6',
                    muted: '#a8a8b3',
                }
            }
        },
    },
    plugins: [],
}
