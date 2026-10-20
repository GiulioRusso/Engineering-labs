// Light / dark theme. Dark is the default; the choice is remembered per viewer when storage works.
const KEY = 'labs-theme';
export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function initTheme(button, onChange) {
  let theme = 'dark';
  try { theme = localStorage.getItem(KEY) || theme; } catch { /* storage blocked: keep default */ }
  const apply = () => {
    document.documentElement.dataset.theme = theme;
    button.setAttribute('aria-pressed', String(theme === 'light'));
    button.textContent = theme === 'light' ? 'Dark' : 'Light';
    button.title = `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`;
    onChange(theme);
  };
  button.addEventListener('click', () => {
    theme = theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
    apply();
  });
  apply();
}
