import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { SlidersHorizontalIcon } from "lucide-react";
import { Hero } from "@/components/common/hero";
import { BookCard, BookGridSkeleton } from "@/components/store/book-card";
import { BookFilters } from "@/components/store/book-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { siteConfig } from "@/config/site";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { api } from "@/lib/api-client";
import {
  activeFilterCount,
  categoryOptions,
  EMPTY_FILTERS,
  filtersFromParams,
  filtersToParams,
  priceBounds,
  publisherOptions,
} from "@/lib/book-filters";

const { browse: copy } = siteConfig;

// No pagination yet; the API's maximum page size covers the whole catalog for now
const PAGE_SIZE = 100;

const GRID = "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4";

const Landing = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, sort } = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  // Rebuilt from the parsed filters, so unrelated or invalid URL params never reach the API
  const queryKey = new URLSearchParams(filtersToParams(filters, sort)).toString();

  const [books, setBooks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const [facets, setFacets] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const addToCart = useAddToCart();

  useEffect(() => {
    const controller = new AbortController();
    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);
        const query = { ...Object.fromEntries(new URLSearchParams(queryKey)), limit: PAGE_SIZE };
        setBooks(await api.get("/books", { query, signal: controller.signal }));
      } catch (err) {
        // A newer filter change aborted this request; its replacement owns the state now
        if (!controller.signal.aborted) setError(err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchBooks();
    return () => controller.abort();
  }, [queryKey, retry]);

  // The sidebar still works without facets, just without category and publisher lists
  useEffect(() => {
    api.get("/books/facets").then(setFacets).catch(() => {});
  }, []);

  const update = (nextFilters, nextSort = sort) => setSearchParams(filtersToParams(nextFilters, nextSort));
  const reset = () => update(EMPTY_FILTERS);
  const activeCount = activeFilterCount(filters);

  const filterProps = {
    value: filters,
    onChange: update,
    onReset: activeCount > 0 ? reset : undefined,
    categories: categoryOptions(facets?.categories),
    publishers: publisherOptions(facets?.publishers),
    priceRange: priceBounds(facets?.price),
  };

  return (
    <>
      <Hero />

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[15rem_1fr]">
        <BookFilters {...filterProps} className="sticky top-20 hidden self-start lg:flex" />

        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger render={<Button variant="outline" className="lg:hidden" />}>
                  <SlidersHorizontalIcon data-icon="inline-start" />
                  {copy.filtersButton}
                  {activeCount > 0 && <Badge className="ml-1">{activeCount}</Badge>}
                </SheetTrigger>
                <SheetContent side="left" className="gap-0">
                  <SheetTitle className="sr-only">{copy.filtersButton}</SheetTitle>
                  <div className="flex-1 overflow-y-auto p-4">
                    <BookFilters {...filterProps} />
                  </div>
                  <SheetFooter className="border-t">
                    <Button onClick={() => setSheetOpen(false)}>
                      {copy.showResults}
                      {books && ` (${books.length})`}
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>

              {books && (
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {copy.resultCount(books.length)}
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{copy.sortLabel}</span>
              <NativeSelect value={sort} onChange={(e) => update(filters, e.target.value)}>
                {copy.sortOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
          </div>

          {error ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{copy.error.title}</EmptyTitle>
                <EmptyDescription>{error.message}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={() => setRetry((n) => n + 1)}>
                  {copy.error.action}
                </Button>
              </EmptyContent>
            </Empty>
          ) : books === null ? (
            <BookGridSkeleton className="lg:grid-cols-3 xl:grid-cols-4" />
          ) : books.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{copy.empty.title}</EmptyTitle>
                <EmptyDescription>{copy.empty.description}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={reset}>
                  {copy.empty.action}
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            // Keep the current results on screen while the next set loads, so the grid doesn't flash
            <div
              className={`${GRID} transition-opacity ${loading ? "opacity-60" : ""}`}
              aria-busy={loading}
            >
              {books.map((book) => (
                <BookCard key={book.id} book={book} onAddToCart={addToCart} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Landing;
