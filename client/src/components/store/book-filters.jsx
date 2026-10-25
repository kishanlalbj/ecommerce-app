import { useState } from 'react'
import { StarIcon } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { siteConfig } from '@/config/site'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/format'

const { filters: copy } = siteConfig

const ANY_RATING = 'any'

const toggle = (list, value, checked) =>
  checked ? [...list, value] : list.filter((v) => v !== value)

// Long lists show the first `limit` options, plus any selected ones so a choice never hides
function CheckboxList({ name, options, selected, onToggle, limit = Infinity }) {
  const [expanded, setExpanded] = useState(false)
  const collapsible = options.length > limit
  const visible =
    collapsible && !expanded
      ? options.filter((o, i) => i < limit || selected.includes(o.value))
      : options

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2.5">
        {visible.map((option) => {
          const id = `filter-${name}-${option.value}`
          return (
            <li key={option.value} className={cn('flex items-center gap-2', option.depth && 'pl-6')}>
              <Checkbox
                id={id}
                checked={selected.includes(option.value)}
                onCheckedChange={(checked) => onToggle(option.value, checked)}
              />
              <Label htmlFor={id} className="flex-1 font-normal">
                {option.label}
              </Label>
              {option.count != null && (
                <span className="text-xs text-muted-foreground tabular-nums">{option.count}</span>
              )}
            </li>
          )
        })}
      </ul>
      {collapsible && (
        <Button
          variant="link"
          size="sm"
          className="self-start px-0"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? copy.showLess : copy.showAll(options.length)}
        </Button>
      )}
    </div>
  )
}

function RatingFilter({ value, onChange }) {
  return (
    <RadioGroup
      value={value == null ? ANY_RATING : String(value)}
      onValueChange={(v) => onChange(v === ANY_RATING ? null : Number(v))}
      aria-label={copy.sections.rating}
    >
      <Label className="flex cursor-pointer items-center gap-2 font-normal">
        <RadioGroupItem value={ANY_RATING} />
        {copy.anyRating}
      </Label>
      {copy.ratings.map((n) => (
        <Label key={n} className="flex cursor-pointer items-center gap-2 font-normal">
          <RadioGroupItem value={String(n)} aria-label={copy.ratingAtLeastLabel(n)} />
          <StarIcon className="size-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
          <span aria-hidden="true">{copy.ratingAtLeast(n)}</span>
        </Label>
      ))}
    </RadioGroup>
  )
}

// Moves freely while dragging and reports only on release, so each drag is one fetch
function PriceFilter({ value, bounds, onChange }) {
  const [min, max] = bounds
  const [draft, setDraft] = useState(() => [value?.[0] ?? min, value?.[1] ?? max])

  const commit = ([lo, hi]) =>
    // Sliding back to the full range clears the filter instead of pinning today's prices
    onChange(lo <= min && hi >= max ? null : [lo <= min ? null : lo, hi >= max ? null : hi])

  return (
    <div className="flex flex-col gap-3 px-1 pt-1">
      <Slider
        min={min}
        max={max}
        step={1}
        value={draft}
        onValueChange={setDraft}
        onValueCommitted={commit}
        aria-label={copy.sections.price}
      />
      <div className="flex justify-between text-sm text-muted-foreground tabular-nums">
        <span>{formatPrice(draft[0])}</span>
        <span>{formatPrice(draft[1])}</span>
      </div>
    </div>
  )
}

// Controlled and presentational: it shows `value` and reports every change through `onChange`.
// value: { categories: [], publishers: [], formats: [], minRating: null, price: null | [min, max], inStock: false }
// categories / publishers: [{ value, label, count?, depth? }]; priceRange: [min, max] the slider can cover.
function BookFilters({
  value,
  onChange,
  onReset,
  categories = [],
  publishers = [],
  formats = copy.formats,
  priceRange = [0, 100],
  className,
}) {
  const set = (patch) => onChange?.({ ...value, ...patch })

  return (
    <aside className={cn('flex flex-col gap-2', className)} aria-label={copy.title}>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">{copy.title}</h2>
        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            {copy.reset}
          </Button>
        )}
      </div>

      <Accordion
        multiple
        defaultValue={['categories', 'publishers', 'rating', 'formats', 'price', 'availability']}
      >
        {categories.length > 0 && (
          <AccordionItem value="categories">
            <AccordionTrigger>{copy.sections.categories}</AccordionTrigger>
            <AccordionContent>
              <CheckboxList
                name="category"
                options={categories}
                selected={value.categories}
                onToggle={(v, checked) => set({ categories: toggle(value.categories, v, checked) })}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {publishers.length > 0 && (
          <AccordionItem value="publishers">
            <AccordionTrigger>{copy.sections.publishers}</AccordionTrigger>
            <AccordionContent>
              <CheckboxList
                name="publisher"
                options={publishers}
                selected={value.publishers}
                limit={6}
                onToggle={(v, checked) => set({ publishers: toggle(value.publishers, v, checked) })}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="rating">
          <AccordionTrigger>{copy.sections.rating}</AccordionTrigger>
          <AccordionContent>
            <RatingFilter value={value.minRating} onChange={(minRating) => set({ minRating })} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="formats">
          <AccordionTrigger>{copy.sections.formats}</AccordionTrigger>
          <AccordionContent>
            <CheckboxList
              name="format"
              options={formats}
              selected={value.formats}
              onToggle={(v, checked) => set({ formats: toggle(value.formats, v, checked) })}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price">
          <AccordionTrigger>{copy.sections.price}</AccordionTrigger>
          <AccordionContent>
            {/* Remount when the value or range changes from outside (reset, Back, facets arriving) */}
            <PriceFilter
              key={`${priceRange.join('-')}:${value.price?.join('-') ?? 'all'}`}
              value={value.price}
              bounds={priceRange}
              onChange={(price) => set({ price })}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="availability">
          <AccordionTrigger>{copy.sections.availability}</AccordionTrigger>
          <AccordionContent>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-in-stock"
                checked={value.inStock}
                onCheckedChange={(inStock) => set({ inStock })}
              />
              <Label htmlFor="filter-in-stock" className="font-normal">
                {copy.inStock}
              </Label>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </aside>
  )
}

export { BookFilters }
