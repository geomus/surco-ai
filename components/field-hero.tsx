import Image from 'next/image'

const DATA_LABELS = [
  { label: 'Real', detail: 'ubicación y pronóstico (Open-Meteo)' },
  { label: 'Ilustrativo', detail: 'productores, contratos y NDVI' },
  { label: 'Manual', detail: 'precio pizarra' },
]

export function FieldHero() {
  return (
    <section aria-labelledby="hero-heading" className="mx-auto w-full max-w-7xl px-4 pt-4">
      <div className="relative isolate overflow-hidden rounded-2xl bg-primary text-primary-foreground">
        <Image
          src="/images/campo-aereo.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1280px) 1248px, 100vw"
          className="-z-10 object-cover opacity-70"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-primary via-primary/80 to-primary/10" />

        <div className="flex flex-col gap-4 px-5 py-6 md:px-8 md:py-8">
          <div className="flex flex-col gap-2">
            <h1 id="hero-heading" className="text-balance text-2xl font-extrabold tracking-tight md:text-4xl">
              Tu campo, en un solo lugar.
            </h1>
            <p className="max-w-xl text-pretty text-sm leading-relaxed text-primary-foreground/85 md:text-base">
              Contale a Mi Campo cómo viene el lote. Cruza clima, satélite y lo que ya vendiste, y te dice qué hacer
              con un semáforo.
            </p>
          </div>

          <ul aria-label="Origen de los datos" className="flex flex-wrap gap-2">
            {DATA_LABELS.map(({ label, detail }) => (
              <li
                key={label}
                className="rounded-full bg-primary/60 px-3 py-1 text-xs leading-relaxed text-primary-foreground/90 backdrop-blur-sm"
              >
                <span className="font-semibold text-primary-foreground">{label}:</span> {detail}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
