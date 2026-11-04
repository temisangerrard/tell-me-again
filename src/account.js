// One Durable Object per email address (named by a hash of it). It holds that person's pending code, account and sessions.
import { DurableObject } from "cloudflare:workers";
import { startOtp, verifyOtp, checkSession, endSession, wipeAccount } from "./account-core.js";
export class Account extends DurableObject {
  #st() { const s = this.ctx.storage; return { get: (k) => s.get(k), put: (k, v) => s.put(k, v), delete: (k) => s.delete(k) }; }
  start(email) { return startOtp(this.#st(), email); }
  verify(email, code, mode) { return verifyOtp(this.#st(), email, code, mode); }
  session(token) { return checkSession(this.#st(), token); }
  logout(token) { return endSession(this.#st(), token); }
  async remove() { await wipeAccount(this.#st()); await this.ctx.storage.deleteAll(); }
}
