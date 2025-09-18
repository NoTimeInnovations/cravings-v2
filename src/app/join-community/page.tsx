'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type DistrictGroup = {
  name: string
  whatsappUrl: string
  description: string
}

const districts: DistrictGroup[] = [
  { name: 'Thiruvananthapuram', whatsappUrl: 'https://chat.whatsapp.com/DiP5Wd1Ck8yA8t8Ch0j1iO', description: 'Capital vibes, coastal eats, and late-night bites.' },
  { name: 'Kollam', whatsappUrl: 'https://chat.whatsapp.com/IbNSIQp4DovHTIYsfbyleU', description: 'Seafood specials and lakeside flavors from Quilon.' },
  { name: 'Pathanamthitta', whatsappUrl: 'https://chat.whatsapp.com/Jyj0l25nlX1BNWcAPzZmWK', description: 'Forest-side feasts and temple-town treats.' },
  { name: 'Alappuzha', whatsappUrl: 'https://chat.whatsapp.com/HXwsVkPIOypGE0zYGQiSIL', description: 'Backwater brunches and toddy shop classics.' },
  { name: 'Kottayam', whatsappUrl: 'https://chat.whatsapp.com/HU6DHMirK6a1I4Sqe2XrYu', description: 'Rubber country favorites and spicy homestyle curries.' },
  { name: 'Idukki', whatsappUrl: 'https://chat.whatsapp.com/Bi4GYPKKpNF7OhiDXZDEHW', description: 'Misty hills, peppered grills, and tea-time snacks.' },
  { name: 'Ernakulam', whatsappUrl: 'https://chat.whatsapp.com/BDP726oooKACS0Y93Al7kR', description: 'City-style cafés, grills, and midnight cravings.' },
  { name: 'Thrissur', whatsappUrl: 'https://chat.whatsapp.com/GbCePgUcEItLcutzCOnvAp', description: 'Pooram-powered plates and festive street food.' },
  { name: 'Palakkad', whatsappUrl: 'https://chat.whatsapp.com/JROy7Wq12jJI7hbm8YdgF7', description: 'Heritage veg spreads and crunchy snacks.' },
  { name: 'Malappuram', whatsappUrl: 'https://chat.whatsapp.com/JQxww64JdPg1VAEwyus62s', description: 'Sulaimani sips, pathiri, and soulful Malabari bites.' },
  { name: 'Kozhikode', whatsappUrl: 'https://chat.whatsapp.com/CfNocjQpkUZHGDm64smhn5', description: 'Biryanis, banana fries, and iconic Kozhi treats.' },
  { name: 'Wayanad', whatsappUrl: 'https://chat.whatsapp.com/BmI3Y8r0gam2rVg7mXLyoQ', description: 'Green escapes with farm-fresh flavors.' },
  { name: 'Kannur', whatsappUrl: 'https://chat.whatsapp.com/Fd899HvRtCY3wQWPZxI6CF', description: 'Thalassery biryani and tea-kadai delicacies.' },
  { name: 'Kasaragod', whatsappUrl: 'https://chat.whatsapp.com/FQilQdjD74M77TOJJkuCzG', description: 'Border-town blends, bold flavors, big love.' },
]

function WhatsAppIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={props.className}
      fill="currentColor"
    >
      <path d="M19.11 17.26c-.3-.15-1.76-.86-2.03-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.24-.46-2.36-1.46-.87-.77-1.46-1.72-1.63-2.01-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.5-.17 0-.37-.02-.57-.02-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.88 1.2 3.09.15.2 2.08 3.17 5.04 4.45.7.3 1.25.48 1.68.61.7.22 1.33.19 1.83.12.56-.08 1.76-.72 2.01-1.43.25-.71.25-1.32.17-1.45-.07-.13-.27-.2-.57-.35z" />
      <path d="M26.73 5.27C24.27 2.82 21.21 1.5 18 1.5 9.99 1.5 3.5 8 3.5 16c0 2.41.63 4.76 1.83 6.83L3 30.5l7.87-2.26C12.86 29.08 15.39 29.5 18 29.5c8.01 0 14.5-6.5 14.5-14.5 0-3.21-1.32-6.27-3.77-8.73zM18 27.5c-2.36 0-4.67-.63-6.69-1.8l-.48-.28-4.69 1.35 1.35-4.69-.28-.48C5.03 19.6 4.5 17.83 4.5 16 4.5 8.56 10.56 2.5 18 2.5c3.41 0 6.61 1.33 9.01 3.74C29.42 7.64 30.5 10.72 30.5 14c0 7.44-6.06 13.5-12.5 13.5z" />
    </svg>
  )
}

export default function JoinCommunityPage() {
  const [copiedKey, setCopiedKey] = useState<string>('')

  const groups = useMemo(() => districts, [])

  const handleCopy = async (url: string, key: string) => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(''), 1500)
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-rose-50 via-white to-emerald-50">
      <section className="relative mx-auto max-w-7xl px-3 py-8 sm:px-4">
        <div className="mx-auto mb-4 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Cravings Kerala WhatsApp Groups
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {groups.map((g) => {
            const key = g.name
            const hasLink = Boolean(g.whatsappUrl)
            return (
              <div
                key={key}
                className="group flex items-center justify-between gap-2 rounded-xl bg-white/80 p-3 shadow-sm ring-1 ring-gray-200 backdrop-blur transition hover:shadow-md"
                title={g.name}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                    <WhatsAppIcon className="h-6 w-6" />
                  </div>
                  <span className="truncate text-sm font-medium text-gray-900">{g.name}</span>
                </div>
                {hasLink ? (
                  <Link
                    href={g.whatsappUrl}
                    target="_blank"
                    className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-20"
                  >
                    Join
                  </Link>
                ) : (
                  <button
                    disabled
                    className="inline-flex items-center rounded-md bg-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600"
                    aria-disabled
                    title="Link coming soon"
                  >
                    Soon
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}


