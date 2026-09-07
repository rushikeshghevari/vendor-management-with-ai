type AuthEvent = 'unauthorized';
type Listener = () => void;

class AuthEventEmitter {
  private listeners: Record<AuthEvent, Set<Listener>> = {
    unauthorized: new Set(),
  };

  on(event: AuthEvent, listener: Listener): () => void {
    this.listeners[event].add(listener);
    return () => this.listeners[event].delete(listener);
  }

  emit(event: AuthEvent): void {
    this.listeners[event].forEach((listener) => listener());
  }
}

export const authEvents = new AuthEventEmitter();
