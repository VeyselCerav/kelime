/** Android/iOS: dokunma sırasında sayfa kayması ve pull-to-refresh’i kilitle */

let lockCount = 0;
let lockedY = 0;

export function getLockedScrollY(): number | null {
  return lockCount > 0 ? lockedY : null;
}

export function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    lockedY = window.scrollY || window.pageYOffset || 0;
    const body = document.body;
    const html = document.documentElement;
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.position = 'fixed';
    body.style.top = `-${lockedY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.dataset.scrollLocked = '1';
  }
  lockCount += 1;
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;

  const body = document.body;
  const html = document.documentElement;
  html.style.overflow = '';
  html.style.overscrollBehavior = '';
  body.style.overflow = '';
  body.style.overscrollBehavior = '';
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  delete body.dataset.scrollLocked;
  window.scrollTo(0, lockedY);
}

/** Kilitliyken window.scrollY 0 döner; kilit Y’sini kullan */
export function pinWindowScroll(preferredY?: number) {
  if (typeof window === 'undefined') return;
  const y =
    preferredY ??
    getLockedScrollY() ??
    window.scrollY ??
    window.pageYOffset ??
    0;
  window.scrollTo(0, y);
  requestAnimationFrame(() => {
    window.scrollTo(0, y);
    requestAnimationFrame(() => window.scrollTo(0, y));
  });
}
