import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const socialLinks = [
  { label: 'Facebook', href: 'https://www.facebook.com/DENR3Official', short: 'f' },
  { label: 'X', href: 'https://x.com/DENROfficial', short: 'X' },
  { label: 'YouTube', href: 'https://www.youtube.com/channel/UClEdMkTnpbKA4aHqepPlj1Q/videos?view_as=subscriber', short: 'YT' },
]

const mandateObjectives = [
  "Assure the availability and sustainability of the country's natural resources through judicious use and systematic restoration or replacement, whenever possible.",
  'Increase the productivity of natural resources in order to meet the demands for forest, mineral, and land resources if a growing population.',
  'Enhance the contribution of natural resources for achieving national economic and social development.',
  'Promote equitable access to natural resources by the different sectors of the population.',
  'Conserve specific terrestrial and marine areas representative of the Philippine natural and cultural heritage for present and future generations.',
]

const coreStatements = [
  {
    label: 'Vision',
    text: 'A nation enjoying and sustaining its natural resources and a clean and healthy environment.',
  },
  {
    label: 'Mission',
    text: 'To mobilize our citizenry in protecting, conserving, and managing the environment and natural resources for the present and future generations.',
  },
  {
    label: 'Development Goal',
    text: 'Human well-being, and environmental quality and sustainability ensured.',
  },
]

const organizationalOutcomes = [
  'Promote human well-being and ensure environmental quality.',
  'Sustainably-managed environment and natural resources.',
  'Adaptive capacities of human communities and natural sytems ensured.',
]

const developmentPrinciples = [
  'Good Governance',
  'Accountability, transparency, integrity, participatory and predictability',
  'Ease of doing business',
  'Social justice',
  'Equity and gross national happiness',
  'Social Enterpreneurship',
  'Partnership with Civil Society',
  'Ecosystem integrity',
  'Sustainable consumption and production',
  'Polluters pay',
  'Payment for ecosystem services',
  'Rule of law',
  'Honoring global commitments',
]

const keyStrategies = [
  {
    text: 'Adoption of the watershed/river basin framework in planning.',
    details: [
      'Prioritizing areas within the watershed',
      'Forest Land Use Planning',
      'Adopting soil and water conservation measures',
      'Agroforestry systems',
    ],
  },
  { text: 'Closing open access areas of forestlands by granting appropriate tenure/ management arrangement.' },
  { text: 'Convergence approach among NGAs, LGUs and CSOs.' },
  { text: 'Area management approach - an integrated area development where all basic societal and economic services are delivered in an area for more impact.' },
  { text: 'Capacity building of DENR frontliners, LGus, CSO partners, POs and docial entrepreneurs.' },
  { text: 'IEC, advocacy and social mobilization.' },
  { text: 'Certification Systems.' },
]

const contactCards = [
  {
    title: 'Hotline',
    kicker: 'National',
    lines: ['(02) 925-8275', '(02) 920-0689'],
  },
  {
    title: 'DENR Hashtag',
    kicker: 'Quick Dial',
    lines: ['Dial #3367.', '(0917) 868 3367', '(0917) 885 3367'],
  },
  {
    title: 'E-mail',
    kicker: 'Aksyon Kalikasan',
    lines: ['aksyonkalikasan@denr.gov.ph'],
  },
  {
    title: 'Regional Hotline',
    kicker: 'Region 3',
    lines: ['Office of the Regional Executive Director', 'E-mail: r3@denr.gov.ph', 'Phone: (045) 860-3941'],
  },
  {
    title: '8888',
    kicker: 'Citizens Complaint',
    lines: ['E-mail: dac_r3@yahoo.com', 'Mobile: 0945 368 5303'],
  },
]

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {open ? <path d="m18 15-6-6-6 6" /> : <path d="m6 9 6 6 6-6" />}
    </svg>
  )
}

function SocialLogo({ label }) {
  if (label === 'Facebook') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M14 8h2V5h-2c-2.8 0-4 1.7-4 4v2H8v3h2v7h3v-7h2.5l.5-3h-3V9c0-.7.3-1 1-1Z" />
      </svg>
    )
  }

  if (label === 'YouTube') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5a3 3 0 0 0-2.1 2.1C2 9 2 12 2 12s0 3 .4 4.8a3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1C22 15 22 12 22 12s0-3-.4-4.8ZM10 15.3V8.7l5.5 3.3L10 15.3Z" />
      </svg>
    )
  }

  return <span className="text-sm font-bold">X</span>
}

function SectionHeading({ eyebrow, title }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1a5e20] sm:text-xs sm:tracking-[0.16em]">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-extrabold leading-tight text-[#00441b] sm:text-2xl">{title}</h2>
    </div>
  )
}

function StatementCard({ label, text }) {
  return (
    <article className="rounded-2xl rounded-tr-none border border-[#d7e0da] bg-white p-4 shadow-[0_10px_24px_rgba(0,68,27,0.09)] sm:p-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1a5e20]">{label}</p>
      <p className="mt-3 text-sm font-medium leading-7 text-[#495057]">{text}</p>
    </article>
  )
}

export default function Landing() {
  const [showPrinciples, setShowPrinciples] = useState(false)

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#f7f9f6] text-[#212529]"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="border-b border-[#d5d5d5] bg-[#f5f5f5]">
        <div className="mx-auto flex min-h-10 max-w-7xl items-center justify-between gap-3 px-3 py-2 text-xs sm:px-6 lg:px-8">
          <a href="https://www.gov.ph/" className="font-bold uppercase tracking-[0.18em] text-[#3f3f3f]">
            GOVPH
          </a>
          <a href="#connect" className="font-semibold text-[#4f4f4f]">
            Contact Us
          </a>
        </div>
      </div>

      <header className="bg-[#0f5f46] text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-white/30 sm:h-16 sm:w-16">
                <img src="/ecowatch-logo.svg" alt="EcoWatch logo" className="h-11 w-11 rounded-full object-contain sm:h-14 sm:w-14" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#e5c76b] sm:text-xs sm:tracking-[0.22em]">Republic of the Philippines</p>
                <h1 className="mt-1 text-xl font-extrabold leading-tight sm:text-3xl">DENR Region 3</h1>
                <p className="mt-1 text-xs font-medium leading-5 text-emerald-50/90 sm:text-sm">Department of Environment and Natural Resources - Central Luzon</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link to="/login" className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/35 bg-white px-5 text-sm font-bold text-[#00441b] sm:w-auto">
                Citizen Login
              </Link>
              <Link to="/admin-login" className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/35 bg-white/10 px-5 text-sm font-bold text-white sm:w-auto">
                Admin Login
              </Link>
            </div>
          </div>

        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          <article className="rounded-2xl rounded-tr-none border border-[#d7e0da] bg-white p-4 shadow-[0_12px_28px_rgba(0,68,27,0.1)] sm:p-6">
            <SectionHeading eyebrow="Mandate (E.O. 192, s. 1987)" title="Conservation, management, development, and proper use of natural resources" />
            <p className="text-sm font-medium leading-7 text-[#495057] sm:text-base">
              The Department is the primary agency responsible for the conservation, management, development, and proper use of the country's environment and natural resources, specifically forest and grazing lands, mineral resources, including those in reservation and watershed areas, and lands of the public domain, as well as the licensing and regulation of all natural resources as may be provided for by law in order to ensure equitable sharing of the benefits derived therefrom for the welfare of the present and future generations of Filipinos.
            </p>
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-[#1a5e20]">Objectives</p>
            <ol className="mt-3 grid gap-3">
              {mandateObjectives.map((objective, index) => (
                <li key={objective} className="flex gap-3 rounded-xl rounded-tr-none border border-[#d7e0da] bg-[#f8f9fa] px-3 py-3 text-sm font-medium leading-6 text-[#495057] sm:px-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00441b] text-xs font-bold text-white">{index + 1}</span>
                  <span>{objective}</span>
                </li>
              ))}
            </ol>
          </article>
        </section>

        <section className="mx-auto grid max-w-7xl gap-3 px-3 pb-4 sm:gap-4 sm:px-6 sm:pb-6 lg:grid-cols-3 lg:px-8">
          {coreStatements.map((item) => (
            <StatementCard key={item.label} label={item.label} text={item.text} />
          ))}
        </section>

        <section className="border-y border-[#d7e0da] bg-[#eef6ea]">
          <div className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-6 sm:py-6 lg:grid-cols-[1fr_1fr] lg:items-start lg:px-8">
            <article className="rounded-2xl rounded-tr-none border border-[#c8d8cf] bg-white p-4 shadow-[0_10px_24px_rgba(0,68,27,0.08)] sm:p-5">
              <SectionHeading eyebrow="Organizational Outcomes" title="Environmental quality and sustainability" />
              <div className="grid gap-3">
                {organizationalOutcomes.map((item) => (
                  <p key={item} className="rounded-xl rounded-tr-none border border-[#d7e0da] bg-[#f8f9fa] px-4 py-3 text-sm font-medium leading-6 text-[#495057]">{item}</p>
                ))}
              </div>
            </article>

            <article className="rounded-2xl rounded-tl-none border border-[#c8d8cf] bg-white p-4 shadow-[0_10px_24px_rgba(0,68,27,0.08)] sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <SectionHeading eyebrow="ENR Development Principle" title="Governance principles" />
                <button
                  type="button"
                  onClick={() => setShowPrinciples((value) => !value)}
                  aria-expanded={showPrinciples}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#c8d8cf] bg-[#f8f9fa] text-[#00441b] shadow-[0_2px_0_#d7e0da]"
                >
                  <ChevronIcon open={showPrinciples} />
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {(showPrinciples ? developmentPrinciples : developmentPrinciples.slice(0, 4)).map((item) => (
                  <div
                    key={item}
                    className="flex min-h-0 items-center rounded-xl rounded-tr-none border border-[#c8d8cf] bg-[linear-gradient(180deg,#ffffff_0%,#f7faf8_100%)] px-4 py-2.5 shadow-[0_2px_0_#d7e0da]"
                  >
                    <span className="text-sm font-semibold leading-5 text-[#00441b]">
                      {item}
                    </span>
                  </div>
                ))}

                {!showPrinciples && (
                  <div className="flex min-h-0 items-center rounded-xl rounded-tr-none border border-dashed border-[#c8d8cf] bg-[#f8f9fa] px-4 py-2.5 text-sm font-semibold leading-5 text-[#1a5e20]">
                    + {developmentPrinciples.length - 4} more principles
                  </div>
                )}
              </div>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          <SectionHeading eyebrow="Key Strategies" title="Approaches for implementation" />
          <div className="grid gap-4">
            {keyStrategies.map((strategy, index) => (
              <article key={strategy.text} className="rounded-2xl rounded-tr-none border border-[#d7e0da] bg-white p-4 shadow-[0_10px_24px_rgba(0,68,27,0.09)] sm:p-5">
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00441b] text-sm font-bold text-white">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-6 text-[#00441b]">{strategy.text}</p>
                    {strategy.details && (
                      <ul className="mt-3 grid gap-2">
                        {strategy.details.map((detail) => (
                          <li key={detail} className="text-sm font-medium leading-6 text-[#495057]">- {detail}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="connect" className="bg-[#eeeeee] text-[#1f2933]">
          <div className="mx-auto grid max-w-7xl gap-8 px-3 py-6 sm:px-6 sm:py-8 lg:grid-cols-[1.6fr_0.8fr] lg:px-8">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[#111827]">Contact Us</h2>
              <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {contactCards.map((item) => (
                  <div key={item.title}>
                    <p className="text-sm font-bold text-[#111827]">{item.title}</p>
                    <div className="mt-1 space-y-1">
                      {item.lines.map((line) => (
                        <p key={line} className="break-words text-sm leading-5 text-[#374151]">{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[#111827]">Government Links</h2>
              <div className="mt-4 grid gap-1 text-sm leading-5 text-[#374151]">
                <a href="https://www.gov.ph/" target="_blank" rel="noreferrer">GOV.PH</a>
                <a href="https://data.gov.ph/" target="_blank" rel="noreferrer">Open Data Portal</a>
                <a href="https://www.officialgazette.gov.ph/" target="_blank" rel="noreferrer">Official Gazette</a>
                <a href="https://r3.denr.gov.ph/" target="_blank" rel="noreferrer">DENR Region 3</a>
              </div>

              <h2 className="mt-8 text-xs font-bold uppercase tracking-[0.08em] text-[#111827]">Official Channels</h2>
              <div className="mt-4 grid gap-2 text-sm leading-5 text-[#374151]">
                {socialLinks.map((item) => (
                  <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#123629] text-white">
                      <SocialLogo label={item.label} />
                    </span>
                    <span>{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

    </div>
  )
}
