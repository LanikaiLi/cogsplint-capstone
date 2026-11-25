// The app's own popup. Any code can call showDialog(); a <DialogHost /> on screen draws it.
// It looks the same on the phone and in the web browser.

export type DialogButton = { text: string; style?: 'cancel'; onPress?: () => void };
export type Dialog = { title: string; message: string; buttons: DialogButton[] };

type Host = { id: number; level: number };

let current: Dialog | null = null;
let hosts: Host[] = [];
let nextHostId = 1;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

// Without buttons the popup has a single "OK".
export function showDialog(title: string, message: string, buttons?: DialogButton[]): void {
  current = { title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] };
  notify();
}

// Closes the popup first, then runs the button's action (which may open another popup).
export function pressDialogButton(button?: DialogButton): void {
  current = null;
  notify();
  button?.onPress?.();
}

export function subscribeToDialog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDialog(): Dialog | null {
  return current;
}

// A popup must be drawn on the layer the user is looking at, or it would be hidden behind it.
// So each layer has a host with a level: main screens 0, slide-up sheets 1, small windows on top 2.
export function registerDialogHost(level: number): { id: number; remove: () => void } {
  const id = nextHostId++;
  hosts = [...hosts, { id, level }];
  notify();
  return {
    id,
    remove: () => {
      hosts = hosts.filter((host) => host.id !== id);
      notify();
    },
  };
}

// The host that draws the popup: the highest level, and the newest one if two are equal.
export function getActiveHostId(): number | null {
  let active: Host | null = null;
  for (const host of hosts) {
    if (!active || host.level >= active.level) {
      active = host;
    }
  }
  return active?.id ?? null;
}
