export type SessionContext = {
  metadata?: Record<string, unknown>;
};

export interface Executable<Input, Output> {
  execute: (input?: Input, sessionContext?: SessionContext) => Promise<Output>;
}
