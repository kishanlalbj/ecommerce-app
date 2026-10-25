import { siteConfig } from '@/config/site'

const { footer } = siteConfig

function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <p className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {siteConfig.name}. {footer.rights}
      </p>
    </footer>
  )
}

export { Footer }
