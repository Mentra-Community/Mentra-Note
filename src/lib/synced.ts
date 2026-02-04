/**
 * @ballah/synced - State Synchronization Library
 *
 * Decorators and base classes for syncing state between
 * TypeScript backend and frontend.
 *
 * Backend: @synced() marks properties that sync, @rpc() marks callable methods
 * Frontend: useSynced() hook returns typed session mirror
 */

// =============================================================================
// Decorator Registry
// =============================================================================

const syncedRegistry = new Map<any, Set<string>>();
const rpcRegistry = new Map<any, Set<string>>();

/**
 * Mark a property to sync to all connected clients.
 *
 * @example
 * class NotesManager extends SyncedManager {
 *   @synced() notes: Note[] = [];
 *   @synced() generating = false;
 * }
 */
export function synced() {
  return function (target: any, propertyKey: string) {
    const constructor = target.constructor;
    if (!syncedRegistry.has(constructor)) {
      syncedRegistry.set(constructor, new Set());
    }
    syncedRegistry.get(constructor)!.add(propertyKey);
  };
}

/**
 * Mark a method as callable from frontend (RPC).
 *
 * @example
 * class NotesManager extends SyncedManager {
 *   @rpc()
 *   async createNote(title: string): Promise<Note> {
 *     return note;
 *   }
 * }
 */
export function rpc() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const constructor = target.constructor;
    if (!rpcRegistry.has(constructor)) {
      rpcRegistry.set(constructor, new Set());
    }
    rpcRegistry.get(constructor)!.add(propertyKey);
    return descriptor;
  };
}

// =============================================================================
// SyncedManager
// =============================================================================

export interface SyncedManagerOptions {
  session: SyncedSession;
  name: string;
}

/**
 * Base class for managers. Extend this for each domain (notes, todos, etc.).
 */
export abstract class SyncedManager {
  protected readonly session: SyncedSession;
  readonly name: string;

  constructor(options: SyncedManagerOptions) {
    this.session = options.session;
    this.name = options.name;

    // Wrap in Proxy to detect property changes
    return this.createProxy();
  }

  /** Load state from DB when session starts */
  abstract hydrate(): Promise<void>;

  /** Save state to DB when session ends */
  abstract persist(): Promise<void>;

  /** Get synced field names */
  getSyncedFields(): string[] {
    return Array.from(syncedRegistry.get(this.constructor) || []);
  }

  /** Get RPC method names */
  getRPCMethods(): string[] {
    return Array.from(rpcRegistry.get(this.constructor) || []);
  }

  /** Get current state snapshot (synced fields only) */
  getState(): Record<string, any> {
    const state: Record<string, any> = {};
    for (const field of this.getSyncedFields()) {
      state[field] = (this as any)[field];
    }
    return state;
  }

  private createProxy(): this {
    const syncedFields = new Set(this.getSyncedFields());
    const manager = this;

    return new Proxy(this, {
      set(target, prop, value) {
        const oldValue = (target as any)[prop];
        (target as any)[prop] = value;

        // Broadcast if synced field changed
        if (syncedFields.has(prop as string) && oldValue !== value) {
          manager.session.broadcastStateChange(
            manager.name,
            prop as string,
            value,
          );
        }

        return true;
      },
    });
  }
}

// =============================================================================
// SyncedSession
// =============================================================================

type WSMessage =
  | { type: "connected" }
  | { type: "snapshot"; state: Record<string, any> }
  | { type: "state_change"; manager: string; property: string; value: any }
  | {
      type: "rpc_request";
      id: string;
      manager: string;
      method: string;
      args: any[];
    }
  | { type: "rpc_response"; id: string; result?: any; error?: string };

/**
 * Base class for user sessions. Container for all managers.
 */
export abstract class SyncedSession {
  readonly userId: string;

  private clients: Set<any> = new Set();
  private managers: Map<string, SyncedManager> = new Map();
  private hydrated = false;

  constructor(userId: string) {
    this.userId = userId;
  }

  /** Register a manager with this session */
  protected registerManager(manager: SyncedManager): void {
    this.managers.set(manager.name, manager);
  }

  /** Get a manager by name */
  getManager<T extends SyncedManager>(name: string): T | undefined {
    return this.managers.get(name) as T | undefined;
  }

  /** Hydrate all managers from DB */
  async hydrate(): Promise<void> {
    if (this.hydrated) return;

    for (const manager of this.managers.values()) {
      await manager.hydrate();
    }

    this.hydrated = true;
  }

  /** Persist all managers to DB */
  async persist(): Promise<void> {
    for (const manager of this.managers.values()) {
      await manager.persist();
    }
  }

  /** Get full state snapshot */
  getSnapshot(): Record<string, any> {
    const snapshot: Record<string, any> = {
      userId: this.userId,
    };

    for (const [name, manager] of this.managers) {
      snapshot[name] = manager.getState();
    }

    return snapshot;
  }

  // ===========================================================================
  // Client Management
  // ===========================================================================

  /** Add a WebSocket client */
  addClient(ws: any): void {
    this.clients.add(ws);

    // Send initial state
    this.sendTo(ws, { type: "connected" });
    this.sendTo(ws, { type: "snapshot", state: this.getSnapshot() });

    console.log(
      `[Session] Client connected for ${this.userId} (total: ${this.clients.size})`,
    );
  }

  /** Remove a WebSocket client */
  removeClient(ws: any): void {
    this.clients.delete(ws);
    console.log(
      `[Session] Client disconnected for ${this.userId} (total: ${this.clients.size})`,
    );
  }

  /** Send message to one client */
  private sendTo(ws: any, message: WSMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (e) {
      this.clients.delete(ws);
    }
  }

  /** Broadcast message to all clients */
  private broadcast(message: WSMessage): void {
    const data = JSON.stringify(message);
    for (const ws of this.clients) {
      try {
        ws.send(data);
      } catch (e) {
        this.clients.delete(ws);
      }
    }
  }

  /** Called by managers when synced property changes */
  broadcastStateChange(manager: string, property: string, value: any): void {
    this.broadcast({
      type: "state_change",
      manager,
      property,
      value,
    });
  }

  // ===========================================================================
  // RPC Handling
  // ===========================================================================

  /** Handle incoming WebSocket message */
  async handleMessage(ws: any, rawMessage: string): Promise<void> {
    try {
      const message = JSON.parse(rawMessage);

      if (message.type === "rpc_request") {
        await this.handleRPC(ws, message);
      } else if (message.type === "request_snapshot") {
        this.sendTo(ws, { type: "snapshot", state: this.getSnapshot() });
      }
    } catch (e) {
      console.error("[Session] Error handling message:", e);
    }
  }

  private async handleRPC(
    ws: any,
    request: { id: string; manager: string; method: string; args: any[] },
  ): Promise<void> {
    const { id, manager: managerName, method, args } = request;

    try {
      const manager = this.managers.get(managerName);
      if (!manager) {
        throw new Error(`Unknown manager: ${managerName}`);
      }

      // Check if method is an RPC
      if (!manager.getRPCMethods().includes(method)) {
        throw new Error(`Method not exposed: ${managerName}.${method}`);
      }

      const fn = (manager as any)[method];
      if (typeof fn !== "function") {
        throw new Error(`Not a function: ${managerName}.${method}`);
      }

      const result = await fn.apply(manager, args);

      this.sendTo(ws, { type: "rpc_response", id, result });
    } catch (e: any) {
      this.sendTo(ws, {
        type: "rpc_response",
        id,
        error: e.message || "RPC failed",
      });
    }
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /** Dispose session */
  async dispose(): Promise<void> {
    await this.persist();
    this.clients.clear();
  }
}

// =============================================================================
// SessionManager
// =============================================================================

export class SessionManager<T extends SyncedSession = SyncedSession> {
  private sessions: Map<string, T> = new Map();
  private factory: (userId: string) => T;

  constructor(factory: (userId: string) => T) {
    this.factory = factory;
  }

  /** Get or create session for user */
  async getOrCreate(userId: string): Promise<T> {
    let session = this.sessions.get(userId);

    if (!session) {
      session = this.factory(userId);
      this.sessions.set(userId, session);
      await session.hydrate();
      console.log(`[SessionManager] Created session for ${userId}`);
    }

    return session;
  }

  /** Get existing session */
  get(userId: string): T | undefined {
    return this.sessions.get(userId);
  }

  /** Remove and dispose session */
  async remove(userId: string): Promise<void> {
    const session = this.sessions.get(userId);
    if (session) {
      await session.dispose();
      this.sessions.delete(userId);
      console.log(`[SessionManager] Removed session for ${userId}`);
    }
  }

  /** Get all active user IDs */
  getActiveUserIds(): string[] {
    return Array.from(this.sessions.keys());
  }
}
