function svg(path, attrs = "") {
  return `<svg ${attrs} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function filledSvg(path, attrs = "") {
  return `<svg ${attrs} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

export const icons = {
  archive: () => svg('<rect width="20" height="5" x="2" y="3" rx="1"></rect><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path><path d="M10 12h4"></path>'),
  sparkles: () => svg('<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"></path>'),
  globe: () => svg('<circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 0 20"></path><path d="M12 2a15.3 15.3 0 0 0 0 20"></path>'),
  text: () => svg('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path>'),
  image: () => svg('<rect width="18" height="18" x="3" y="3" rx="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"></path>'),
  code: () => svg('<path d="m16 18 6-6-6-6"></path><path d="m8 6-6 6 6 6"></path>'),
  json: () => svg('<path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1"></path><path d="M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1"></path>'),
  key: () => svg('<circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6"></path><path d="m15.5 7.5 3 3L22 7"></path>'),
  github: () => svg('<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.1-1.3-.4-2.6-1.3-3.5.4-1.1.4-2.4 0-3.5 0 0-1 0-3 1.5a10.4 10.4 0 0 0-5.4 0C8.3 2 7.3 2 7.3 2c-.4 1.1-.4 2.4 0 3.5A5 5 0 0 0 6 9c0 3.5 3 5.5 6 5.5-.4.5-.8 1.4-.8 2.5v5"></path><path d="M9 18c-4.5 2-5-2-7-2"></path>'),
  logout: () => svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path>'),
  refresh: () => svg('<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path>'),
  search: () => svg('<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>'),
  star: (filled = false) => filled ? filledSvg('<path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01Z"></path>') : svg('<path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01Z"></path>'),
  tag: () => svg('<path d="M12.6 2.4 3 12l9 9 9.6-9.6a2 2 0 0 0 0-2.8l-6.2-6.2a2 2 0 0 0-2.8 0Z"></path><circle cx="8.5" cy="8.5" r=".5"></circle>'),
  plus: () => svg('<path d="M5 12h14"></path><path d="M12 5v14"></path>'),
  check: () => svg('<path d="m20 6-11 11-5-5"></path>'),
  eye: () => svg('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle>'),
  eyeOff: () => svg('<path d="m15 18-.7-3"></path><path d="M2 2l20 20"></path><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"></path><path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c7 0 10 8 10 8a13.3 13.3 0 0 1-2.1 3.4"></path><path d="M6.6 6.6C3.7 8.6 2 12 2 12s3 8 10 8a9.7 9.7 0 0 0 5.4-1.6"></path>'),
  heart: (filled = false) => filled ? filledSvg('<path d="M19.5 12.6 12 20l-7.5-7.4a5 5 0 1 1 7.1-7.1l.4.4.4-.4a5 5 0 1 1 7.1 7.1Z"></path>') : svg('<path d="M19.5 12.6 12 20l-7.5-7.4a5 5 0 1 1 7.1-7.1l.4.4.4-.4a5 5 0 1 1 7.1 7.1Z"></path>'),
  copy: () => svg('<rect width="14" height="14" x="8" y="8" rx="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>'),
  external: () => svg('<path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>'),
  trash: () => svg('<path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>'),
  lock: () => svg('<rect width="18" height="11" x="3" y="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>'),
  unlock: () => svg('<rect width="18" height="11" x="3" y="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path>'),
  shield: () => svg('<path d="M20 13c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"></path><path d="m9 12 2 2 4-4"></path>'),
  sliders: () => svg('<path d="M4 21v-7"></path><path d="M4 10V3"></path><path d="M12 21v-9"></path><path d="M12 8V3"></path><path d="M20 21v-5"></path><path d="M20 12V3"></path><path d="M2 14h4"></path><path d="M10 8h4"></path><path d="M18 16h4"></path>'),
  more: () => svg('<circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle>'),
  share: () => svg('<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="m8.6 13.5 6.8 4"></path><path d="m15.4 6.5-6.8 4"></path>'),
  settings: () => svg('<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.5 1Z"></path>'),
  grid: () => svg('<circle cx="5" cy="5" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="19" cy="5" r="1"></circle><circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="19" r="1"></circle><circle cx="12" cy="19" r="1"></circle><circle cx="19" cy="19" r="1"></circle>'),
  panel: () => svg('<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M12 3v18"></path>'),
  chevronDown: () => svg('<path d="m6 9 6 6 6-6"></path>'),
  chevronRight: () => svg('<path d="m9 18 6-6-6-6"></path>'),
  audio: () => svg('<path d="M2 10v4"></path><path d="M6 7v10"></path><path d="M10 4v16"></path><path d="M14 8v8"></path><path d="M18 11v2"></path><path d="M22 9v6"></path>'),
  book: () => svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M4 4v15.5"></path><path d="M20 22V6a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 6.5"></path>'),
  video: () => svg('<rect width="16" height="12" x="3" y="6" rx="2"></rect><path d="m15 10 5-3v10l-5-3Z"></path>'),
  nodes: () => svg('<rect width="6" height="6" x="3" y="3" rx="1"></rect><rect width="6" height="6" x="15" y="3" rx="1"></rect><rect width="6" height="6" x="9" y="15" rx="1"></rect><path d="M9 6h6"></path><path d="m6 9 6 6 6-6"></path>'),
  report: () => svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path><path d="M8 13h8"></path><path d="M8 17h6"></path>'),
  card: () => svg('<rect width="18" height="14" x="3" y="5" rx="2"></rect><path d="M7 9h5"></path><path d="M7 13h3"></path><path d="m16 9 1 1 2-2"></path>'),
  quiz: () => svg('<path d="M9.1 9a3 3 0 1 1 5.8 1c-.7 1.3-2.1 1.7-2.6 2.7"></path><path d="M12 17h.01"></path><rect width="18" height="18" x="3" y="3" rx="2"></rect>'),
  chart: () => svg('<path d="M3 3v18h18"></path><rect width="3" height="7" x="7" y="10"></rect><rect width="3" height="12" x="13" y="5"></rect><rect width="3" height="4" x="19" y="13"></rect>'),
  table: () => svg('<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path><path d="M9 3v18"></path>')
  ,
  home: () => svg('<path d="m3 11 9-8 9 8"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path>'),
  clock: () => svg('<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>'),
  folder: () => svg('<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"></path>'),
  bookmark: () => svg('<path d="M19 21 12 17 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"></path>'),
  list: () => svg('<path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path>'),
  edit: () => svg('<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>'),
  link: () => svg('<path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"></path><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"></path>'),
  bold: () => svg('<path d="M6 4h8a4 4 0 0 1 0 8H6z"></path><path d="M6 12h9a4 4 0 0 1 0 8H6z"></path>'),
  italic: () => svg('<path d="M19 4h-9"></path><path d="M14 20H5"></path><path d="M15 4 9 20"></path>'),
  underline: () => svg('<path d="M6 4v6a6 6 0 0 0 12 0V4"></path><path d="M4 22h16"></path>')
};

export function installIconSupport() {
  const style = document.createElement("style");
  style.textContent = ".primary-round{background:var(--blue);color:white}.min-w-0{min-width:0}.google-g{display:grid;place-items:center;width:18px;height:18px;border:1px solid var(--line);border-radius:50%;color:var(--blue);font-size:12px;font-weight:700}";
  document.head.append(style);
}
