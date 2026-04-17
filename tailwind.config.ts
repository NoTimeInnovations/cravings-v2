import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ['class'],
	content: [
		"./src/screens/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			fontFamily: {
				handwriting: ['var(--font-dancing-script)', 'cursive'],
				sans: ['var(--font-geist)', 'var(--font-inter)', 'sans-serif'],
			},
			colors: {
				terracotta: {
					50: '#fdf3ee',
					100: '#fbe4d8',
					200: '#f6c5af',
					300: '#f0a07d',
					400: '#e87549',
					500: '#a64e2a',
					600: '#a64e2a',
					700: '#8a3e20',
					800: '#6f3320',
					900: '#5b2c1e',
					950: '#31140d',
				},
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'slide-in-right': {
					from: { transform: 'translateX(100%)', opacity: '0' },
					to: { transform: 'translateX(0)', opacity: '1' }
				},
				'slide-out-left': {
					from: { transform: 'translateX(0)', opacity: '1' },
					to: { transform: 'translateX(-100%)', opacity: '0' }
				},
				'slide-up': {
					from: { transform: 'translateY(100%)' },
					to: { transform: 'translateY(0)' }
				},
				'slide-down': {
					from: { transform: 'translateY(0)' },
					to: { transform: 'translateY(100%)' }
				},
				'fade-in': {
					from: { opacity: '0' },
					to: { opacity: '1' }
				},
				'fade-out': {
					from: { opacity: '1' },
					to: { opacity: '0' }
				},
				'scale-in': {
					from: { transform: 'scale(0.95)', opacity: '0' },
					to: { transform: 'scale(1)', opacity: '1' }
				},
				'bounce-in': {
					'0%': { transform: 'translateY(-80px)', opacity: '0' },
					'60%': { transform: 'translateY(8px)', opacity: '1' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
				'slide-out-left': 'slide-out-left 0.3s ease-out forwards',
				'slide-up': 'slide-up 0.3s ease-out forwards',
				'slide-down': 'slide-down 0.3s ease-out forwards',
				'fade-in': 'fade-in 0.3s ease-out forwards',
				'fade-out': 'fade-out 0.2s ease-out forwards',
				'scale-in': 'scale-in 0.2s ease-out forwards',
				'bounce-in-1': 'bounce-in 0.5s ease-out 0.1s forwards',
				'bounce-in-2': 'bounce-in 0.5s ease-out 0.2s forwards',
				'bounce-in-3': 'bounce-in 0.5s ease-out 0.3s forwards',
			}
		}
	},
	plugins: [tailwindcssAnimate, require("tailwindcss-animate"), require("tailwind-scrollbar-hide")],
} satisfies Config;
