/**
 * Pre-paint appearance bootstrap.
 *
 * Runs before the first render so the theme, accent and motion preference are
 * already on <html> — no flash of the wrong palette for returning users.
 * Mirrors `applyAppearance` from the settings provider.
 */
const SCRIPT = `(function(){try{
  var root=document.documentElement;
  var raw=window.localStorage.getItem('quantix:settings');
  var s=raw?JSON.parse(raw):{};
  var theme=s.theme||'dark';
  var accent=s.accent||'violet';
  var motion=s.reduceMotion?'reduced':'full';
  var prefersLight=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches;
  var resolved=theme==='system'?(prefersLight?'light':'dark'):theme;
  root.setAttribute('data-theme',resolved);
  root.setAttribute('data-accent',accent);
  root.setAttribute('data-motion',motion);
  root.style.colorScheme=resolved;
}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
