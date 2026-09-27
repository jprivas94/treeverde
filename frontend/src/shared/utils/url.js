// Helpers de parámetros de la URL actual (enlaces de invitación y reset).

export function getUrlParam(name) {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

/** Quita el parámetro de la URL sin recargar la página. */
export function removeUrlParam(name) {
  const url = new URL(window.location);
  if (!url.searchParams.has(name)) return;
  url.searchParams.delete(name);
  window.history.replaceState({}, '', url);
}
