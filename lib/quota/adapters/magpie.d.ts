/**
 * Magpie gateway adapter: the aggregated quota cards of every upstream
 * account the local magpie gateway holds, read through its read-only
 * `GET /v1/magpie/quotas?kept=1` report. Only the gateway's last read is
 * consumed: polling, opening and retrying never ask vendors to refresh.
 *
 * Identity is PROBED, not assumed: a magpie route is a user-declared
 * OpenAI-compatible profile with an arbitrary name and a loopback-ish
 * base URL no host table can enumerate. The adapter claims the `magpie`
 * route key directly; every other unknown route is resolved by
 * {@link MagpieDetector} (the gateway's `GET /v1` hello answers
 * `{"name":"magpie"}`), which the quota service consults when the
 * registry finds nothing — see quota-service.ts.
 *
 * Model scoping: magpie's model ids are `provider/model`, so the model
 * the asking session uses names the card(s) to show — the account(s) of
 * that provider, several when the user signed in more than one. A
 * routing group id (`group/…`, whose members the gateway does not list
 * over REST) and a bare model id scope to NOTHING, and an unmatched
 * prefix falls back to the whole fleet: a group may route anywhere, and
 * the full card list is what the user arranged the gateway around.
 *
 * Window vocabulary: magpie reports open-named windows ("5 hours",
 * "Weekly", "7 days · Opus", "Credits", "Allowance") with used shares in
 * percent; the known period names map onto the wire's tiers, the rest
 * ride as `other` windows carrying the vendor's own name. Balances are
 * sign-prefixed money strings ("¥356.81", "$11.12 · ¥-0.05" when a
 * vendor reports two currencies) — the first amount parses, its sign
 * naming the currency.
 *
 * @module token-usage/quota/adapters/magpie
 */
import type { QuotaAdapter } from '../types.ts';
/** The route key that claims this adapter outright (no probe needed). */
export declare const ROUTE_MAGPIE = "magpie";
/** The gateway's default listen address, used when the profile carries no
 * base URL (the `magpie` route key with a bare profile). */
export declare const DEFAULT_MAGPIE_BASE = "http://127.0.0.1:3425/v1";
/**
 * The gateway root a base URL points at: trailing slashes trimmed, and a
 * bare origin (no `/v1` tail) kept as-is — magpie mounts its API at the
 * root, so both `http://host:3425` and `http://host:3425/v1` are valid
 * client base URLs and every endpoint path is appended verbatim.
 */
export declare function magpieBaseOf(baseUrl: string | undefined): string;
/** The quota report URL of one gateway base. */
export declare function magpieQuotaUrl(baseUrl: string | undefined): string;
/**
 * The magpie gateway adapter. One query answers the cards the asking
 * model draws on — see the module note for the scoping rules.
 */
export declare const magpieAdapter: QuotaAdapter;
/**
 * The magpie gateway detector: decides whether a base URL points at a
 * magpie, caching both verdicts so the unsupported-path poll the panel
 * keeps running never hammers the probe. The gateway answers every
 * OpenAI-compatible hello (`GET /` and `GET /v1`) with
 * `{"name":"magpie","version":…}` — a handshake it maintains precisely
 * so clients can feature-detect it.
 */
export declare class MagpieDetector {
    #private;
    /** @param now - clock seam; tests freeze it. */
    constructor(now?: () => number);
    /** How long a POSITIVE verdict stays authoritative (the gateway is not
     * going to stop being one). */
    static readonly HIT_TTL_MS: number;
    /** How long a NEGATIVE verdict holds — short, so a gateway that comes
     * up between polls is found on the next one. */
    static readonly MISS_TTL_MS: number;
    /**
     * Whether the base URL answers magpie's hello.
     * @param input - the base URL (undefined reads the default gateway),
     * the transport, and the optional gateway key (a shared gateway on
     * another machine requires it; the loopback one does not mind).
     */
    detect(input: {
        baseUrl?: string;
        apiKey?: string;
        fetchFn: typeof fetch;
        signal?: AbortSignal;
    }): Promise<boolean>;
}
//# sourceMappingURL=magpie.d.ts.map