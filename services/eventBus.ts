
// A simple publish-subscribe event bus to decouple components.
type EventHandler = (data?: any) => void;

class EventBus {
  private events: { [key: string]: EventHandler[] } = {};

  public on(event: string, callback: EventHandler): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    // Return an unsubscribe function
    return () => this.off(event, callback);
  }

  public off(event: string, callback: EventHandler): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  public emit(event: string, data?: any): void {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }
}

const eventBus = new EventBus();
export default eventBus;
