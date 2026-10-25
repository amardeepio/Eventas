"use client";

import { useEffect } from "react";
import { fetchTranslations, getCached } from "@/lib/translate/client";
import { isTranslatableText, splitWhitespace } from "./text";
import { DEFAULT_LANGUAGE } from "./languages";
import { useLanguage } from "./language-provider";

const ATTRIBUTES = ["placeholder", "aria-label", "title", "alt"] as const;
const SKIP_SELECTOR = [
  "script",
  "style",
  "noscript",
  "code",
  "pre",
  "svg",
  "canvas",
  "iframe",
  "textarea",
  '[contenteditable="true"]',
  '[translate="no"]',
  "[data-no-translate]",
].join(",");
const BATCH_TEXTS = 50;
const BATCH_CHARS = 4_800;

interface TextEntry {
  raw: string;
  target: string;
}

interface AttrEntry {
  raw: string;
  target: string;
}

interface AttrTarget {
  element: Element;
  attribute: (typeof ATTRIBUTES)[number];
  source: string;
}

function chunk(texts: string[]): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let chars = 0;
  for (const text of texts) {
    if (current.length > 0 && (current.length >= BATCH_TEXTS || chars + text.length > BATCH_CHARS)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(text);
    chars += text.length;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

/**
 * Translates the rendered interface in place.
 *
 * Copy stays in React's source language; this layer swaps text nodes and the
 * handful of translated attributes (placeholders, aria-labels, titles) after
 * they render. Results are served from localStorage first, so a second visit in
 * the same language costs no API calls. Elements marked `translate="no"`
 * (chat messages, user-authored content) and code-like nodes are skipped.
 */
export function DocumentTranslator() {
  const { language, ready, reportTranslating } = useLanguage();

  useEffect(() => {
    if (!ready) return;
    const body = document.body;
    if (!body) return;
    if (language === DEFAULT_LANGUAGE) return;

    const textEntries = new Map<Text, TextEntry>();
    const attrEntries = new Map<Element, Map<string, AttrEntry>>();

    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let passToken = 0;

    const isExcluded = (element: Element | null): boolean =>
      Boolean(element?.closest(SKIP_SELECTOR));

    const applyText = (node: Text, source: string, target: string) => {
      if (!node.isConnected) {
        textEntries.delete(node);
        return;
      }
      const raw = node.nodeValue ?? "";
      const current = raw.trim();
      if (current !== source && current !== target) return;
      const { lead, trail } = splitWhitespace(raw);
      node.nodeValue = `${lead}${target}${trail}`;
      textEntries.set(node, { raw: `${lead}${source}${trail}`, target });
    };

    const applyAttribute = (item: AttrTarget, target: string) => {
      if (!item.element.isConnected) return;
      const current = item.element.getAttribute(item.attribute);
      if (current === null) return;
      const trimmed = current.trim();
      if (trimmed !== item.source && trimmed !== target) return;
      const { lead, trail } = splitWhitespace(current);
      item.element.setAttribute(item.attribute, `${lead}${target}${trail}`);
      const map = attrEntries.get(item.element) ?? new Map<string, AttrEntry>();
      map.set(item.attribute, { raw: `${lead}${item.source}${trail}`, target });
      attrEntries.set(item.element, map);
    };

    const pass = async () => {
      if (disposed) return;
      const token = ++passToken;
      const wantedText = new Map<string, Text[]>();
      const wantedAttrs = new Map<string, AttrTarget[]>();

      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      let current = walker.nextNode();
      while (current) {
        if (disposed || token !== passToken) return;
        const node = current as Text;
        current = walker.nextNode();
        if (isExcluded(node.parentElement)) continue;
        const raw = node.nodeValue ?? "";
        const { core } = splitWhitespace(raw);
        if (!isTranslatableText(core)) continue;

        const existing = textEntries.get(node);
        if (existing && raw.trim() === existing.target) continue;
        if (existing && raw === existing.raw) {
          const { lead, trail } = splitWhitespace(raw);
          node.nodeValue = `${lead}${existing.target}${trail}`;
          continue;
        }
        const cached = getCached(language, core);
        if (cached) {
          const { lead, trail } = splitWhitespace(raw);
          node.nodeValue = `${lead}${cached}${trail}`;
          textEntries.set(node, { raw, target: cached });
          continue;
        }
        const group = wantedText.get(core);
        if (group) group.push(node);
        else wantedText.set(core, [node]);
      }

      for (const element of body.querySelectorAll<Element>("[placeholder],[aria-label],[title],[alt]")) {
        if (disposed || token !== passToken) return;
        if (isExcluded(element)) continue;
        for (const attribute of ATTRIBUTES) {
          const value = element.getAttribute(attribute);
          if (!value) continue;
          const { core } = splitWhitespace(value);
          if (!isTranslatableText(core)) continue;

          const existing = attrEntries.get(element)?.get(attribute);
          if (existing && value.trim() === existing.target) continue;
          if (existing && value === existing.raw) {
            const { lead, trail } = splitWhitespace(value);
            element.setAttribute(attribute, `${lead}${existing.target}${trail}`);
            continue;
          }
          const cached = getCached(language, core);
          if (cached) {
            const { lead, trail } = splitWhitespace(value);
            element.setAttribute(attribute, `${lead}${cached}${trail}`);
            const map = attrEntries.get(element) ?? new Map<string, AttrEntry>();
            map.set(attribute, { raw: value, target: cached });
            attrEntries.set(element, map);
            continue;
          }
          const item: AttrTarget = { element, attribute, source: core };
          const group = wantedAttrs.get(core);
          if (group) group.push(item);
          else wantedAttrs.set(core, [item]);
        }
      }

      const missing = [
        ...new Set([...wantedText.keys(), ...wantedAttrs.keys()]),
      ];
      if (missing.length === 0) return;

      reportTranslating(true);
      try {
        for (const batch of chunk(missing)) {
          if (disposed || token !== passToken) return;
          const translations = await fetchTranslations(language, batch);
          if (disposed || token !== passToken) return;
          for (const [source, nodes] of wantedText) {
            const target = translations[source];
            if (!target) continue;
            for (const node of nodes) applyText(node, source, target);
          }
          for (const [source, items] of wantedAttrs) {
            const target = translations[source];
            if (!target) continue;
            for (const item of items) applyAttribute(item, target);
          }
        }
      } finally {
        if (!disposed && token === passToken) reportTranslating(false);
      }
    };

    const schedule = () => {
      if (disposed || timer) return;
      timer = setTimeout(() => {
        timer = null;
        void pass();
      }, 80);
    };

    const observer = new MutationObserver((records) => {
      const relevant = records.some((record) => {
        if (record.type === "characterData") return !isExcluded(record.target.parentElement);
        if (record.type === "attributes") return !isExcluded(record.target as Element);
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            if (!isExcluded(node.parentElement)) return true;
          } else if (node.nodeType === Node.ELEMENT_NODE && !isExcluded(node as Element)) {
            return true;
          }
        }
        return false;
      });
      if (relevant) schedule();
    });

    observer.observe(body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRIBUTES],
    });

    void pass();

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      observer.disconnect();
      // Put the source language back so the next language starts from English.
      for (const [node, entry] of textEntries) {
        if (!node.isConnected) continue;
        const raw = node.nodeValue ?? "";
        if (raw.trim() !== entry.target) continue;
        const { lead, trail } = splitWhitespace(raw);
        node.nodeValue = `${lead}${entry.raw.trim()}${trail}`;
      }
      for (const [element, map] of attrEntries) {
        if (!element.isConnected) continue;
        for (const [attribute, entry] of map) {
          const value = element.getAttribute(attribute);
          if (value === null || value.trim() !== entry.target) continue;
          const { lead, trail } = splitWhitespace(value);
          element.setAttribute(attribute, `${lead}${entry.raw.trim()}${trail}`);
        }
      }
      textEntries.clear();
      attrEntries.clear();
    };
  }, [language, ready, reportTranslating]);

  return null;
}
