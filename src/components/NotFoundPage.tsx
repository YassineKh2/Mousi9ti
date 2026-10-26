import React from "react";
import { ArrowRight, AudioLines, Grid3X3, Home, Sparkles } from "lucide-react";
import "./NotFoundPage.css";

export function NotFoundPage() {
  return (
    <div className="not-found-page bg-background text-on-background">
      <header className="not-found-header">
        <a href="/" aria-label="Mousi9ti home" className="not-found-brand">
          <img
            src="/Mousi9tiSmall.svg"
            alt=""
            width="40"
            height="40"
            className="not-found-logo-light"
          />
          <img
            src="/Mousi9tiWhiteSmall.svg"
            alt=""
            width="40"
            height="40"
            className="not-found-logo-dark"
          />
          <span>Mousi9ti</span>
        </a>
        <span className="not-found-status text-on-surface-variant">
          PAGE NOT FOUND
        </span>
      </header>

      <main className="not-found-main">
        <div className="not-found-code" aria-hidden="true">
          <span>4</span>
          <span className="not-found-record">
            <span />
          </span>
          <span>4</span>
        </div>
        <p className="not-found-eyebrow text-tertiary">
          404 / A LITTLE OFFBEAT
        </p>
        <h1>Lost the rhythm?</h1>
        <p className="not-found-description text-on-surface-variant">
          This page doesn&apos;t exist, but your next practice is right here.
        </p>
        <a href="/" className="not-found-home bg-primary text-on-primary">
          <Home size={18} aria-hidden="true" />
          Back to the studio
          <ArrowRight size={18} aria-hidden="true" />
        </a>

        <nav className="not-found-destinations" aria-label="Practice tools">
          {[
            { href: "/chords/", label: "Chords", icon: Grid3X3 },
            { href: "/scales/", label: "Scales", icon: Sparkles },
            { href: "/metronome/", label: "Metronome", icon: AudioLines },
          ].map(({ href, label, icon: Icon }) => (
            <a key={href} href={href} className="text-on-surface-variant">
              <Icon size={17} aria-hidden="true" />
              {label}
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          ))}
        </nav>
      </main>
      <footer className="not-found-footer text-on-surface-variant">
        A wrong turn. Not a wrong note.
      </footer>
    </div>
  );
}
