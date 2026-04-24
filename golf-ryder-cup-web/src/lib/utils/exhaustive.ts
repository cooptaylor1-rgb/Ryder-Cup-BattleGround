/**
 * assertExhaustive — compile-time + runtime guard for closed-union
 * switch statements. Place in the default branch:
 *
 *   switch (event.type) {
 *     case 'create': return handleCreate(event);
 *     case 'update': return handleUpdate(event);
 *     default: assertExhaustive(event);
 *   }
 *
 * The parameter type is `never`, so if a new variant is added to
 * the union without a matching case, the compiler refuses to
 * accept the unhandled value here. At runtime, if a malformed
 * value reaches the default branch (malformed persistence, forged
 * RPC), the helper throws a diagnostic error instead of silently
 * falling through.
 */
export function assertExhaustive(value: never, messagePrefix = 'Unhandled variant'): never {
  throw new Error(`${messagePrefix}: ${JSON.stringify(value)}`);
}
