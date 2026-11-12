/**
 * Staged form over the `token-usage` settings namespace's fields: the data
 * directory and the mirror region pick.
 *
 * A settings write is a durable, revision-fenced document mutation, so the
 * controls stage what the user picks and commit them only on save: what is on
 * screen is exactly what a save would store. Each field shows its effective
 * value (user layer over composition layer over schema default) and whether
 * the user layer carries it — key presence, not a value comparison, marks an
 * override. The namespace has no secret fields, so there is no write-only
 * control here.
 *
 * Self-contained on purpose: the client bundle-purity rule forbids value
 * imports across plugins, so this package stages and fences its own form
 * (and its own snapshot store) rather than importing the settings section's
 * shared model.
 *
 * @module token-usage/client/card-form
 */
/**
 * Minimal snapshot contract of a configuration form (the host's
 * ConfigFormSnapshot shape, as this package consumes it).
 */
export interface CardFormTargetSnapshot<T = SectionValue> {
    /** Loading, ready, or unavailable state. */
    status: 'loading' | 'ready' | 'unavailable';
    /** Resolved section value. */
    value?: T;
    /** Raw user override layer, if present. */
    user?: unknown;
    /** Whether the scope accepts writes. */
    writable: boolean;
}
/**
 * The configuration source backing the card: the host's `ConfigForm<T>` for
 * the `token-usage` namespace.
 */
export interface CardFormTarget<T = SectionValue> {
    /** Current snapshot view. */
    getSnapshot(): CardFormTargetSnapshot<T>;
    /** Subscribe to snapshot changes. Returns disposer. */
    subscribe(listener: () => void): () => void;
    /** Write one scalar field. */
    set(field: string, value: unknown): Promise<boolean>;
    /** Clear one scalar field back to inherited configuration. */
    unset(field: string): Promise<boolean>;
}
/** Placeholder target while the configForms service has not mounted (or its
 * describe mirror does not serve this namespace yet); the card renders
 * nothing and never throws. */
export declare function createFallbackTarget(): CardFormTarget<SectionValue>;
/** The fields this card edits. */
export declare const CARD_FIELDS: readonly ["path", "pricingRegion"];
/** One editable field of the token-usage settings section. */
export type CardField = typeof CARD_FIELDS[number];
/** The resolved user-facing section this card edits. */
export interface SectionValue {
    path?: string;
    pricingRegion?: string;
    sidebarPinned?: boolean;
}
/** Live migration progress the card polls after saving a directory change. */
export interface MigrationView {
    /** Files finished so far. */
    done: number;
    /** Total files this migration touches. */
    total: number;
    /** Phase label for the progress line. */
    phase: 'copying' | 'cleaning';
}
/**
 * Minimal observable snapshot source: the stable-reference discipline the
 * shell's stores follow (same snapshot object until the fact moves), with
 * nothing the multi-field form does not use.
 */
export interface CardStore {
    /** @returns the current snapshot (stable reference until the next change). */
    getSnapshot(): CardState;
    /** @param listener - invoked after each snapshot change. @returns the disposer. */
    subscribe(listener: () => void): () => void;
    /** @param next - the new snapshot; replaces the reference only on a real change. */
    set(next: CardState): void;
}
/**
 * Why the Host refused the last save, in a shape the card's locale renders.
 * The settings wire never delivers a refused write's reason (the bound scope
 * recovers silently and resolves), so the form asks the plugin's own guard
 * route and reports the verdict itself.
 */
export interface SaveRefusal {
    /** The mid-conversation veto on a directory change. */
    kind: 'sessions-interacting';
    /** Sessions mid-conversation at refusal time, for the notice's number. */
    interactingSessions: number;
}
/** What the token-usage settings card renders. */
export interface CardState {
    /** False while the namespace is not served to this client; the card renders nothing. */
    available: boolean;
    /** Whether the Host document accepts writes. */
    writable: boolean;
    /** Whether the usage entry is pinned as a resident sidebar row: the
     * effective (resolved) value the checkbox shows when untouched. */
    sidebarPinned: boolean;
    /** Staged pin toggle; undefined while untouched. A staged edit shows in
     * the checkbox and commits only on save. */
    pinnedDraft: boolean | undefined;
    /** Draft text per field ('' marks the inherited/default option). */
    fields: Record<CardField, string>;
    /** Whether saving each field would leave a user-layer entry. */
    overridden: Record<CardField, boolean>;
    /** Whether the form holds an edit that a save would write. */
    dirty: boolean;
    /** Whether a TEXT field holds an unsaved edit. The pricing-sync gate reads
     * this, not `dirty`: the staged pin toggle has no say over the pricing
     * source, so it must not block a sync. */
    textDirty: boolean;
    /** Whether a save is crossing the wire. */
    saving: boolean;
    /** Whether the last save did not land as staged; cleared by the next edit or save. */
    failed: boolean;
    /** The Host's refusal of the last save, when the guard named one; cleared
     * by the next edit or save. */
    refusal: SaveRefusal | undefined;
    /** Migration progress while the Host relocates the data directory. */
    migration: MigrationView | undefined;
}
/** The form actions the card's slot entry injects. */
export interface CardActions {
    /** Stage draft text for one field. */
    editField: (field: CardField, text: string) => void;
    /** Stage the sidebar-pin toggle; it commits only on save. */
    editPinned: (value: boolean) => void;
    /** Stage a clear for one field, so saving lets it re-inherit the composition layer. */
    clearField: (field: CardField) => void;
    /** Write every staged edit, then re-seed from what the Host accepted. */
    save: () => void;
    /** Drop every staged edit. */
    discard: () => void;
}
/**
 * Stages the settings edits over the `token-usage` scope.
 *
 * The form publishes through a snapshot store because the slot component
 * reads through a snapshot selector while both the scope and the local drafts
 * change underneath; every projection is rebuilt from the two together. Only
 * fields the user touched are staged, so a save writes a sparse patch and
 * never restates fields it did not see.
 */
export declare class CardForm {
    private readonly target;
    private snapshotValue;
    private readonly listeners;
    private drafts;
    /** Staged sidebar-pin toggle; undefined while untouched. */
    private draftPinned;
    private saving;
    private failed;
    private refusal;
    private migrationView;
    private pollTimer;
    /**
     * @param target - the configuration source backing the card (a ConfigForm).
     */
    constructor(target: CardFormTarget<SectionValue>);
    /** @returns the store the card's component reads through its bound selector. */
    bind(): CardStore;
    /** @returns the edit, clear, save, and discard actions bound to this form. */
    actions(): CardActions;
    /**
     * Write the staged edits, then re-seed from what the Host accepted.
     *
     * The Host is the only authority on acceptance — an empty draft clears the
     * field, anything else stores the trimmed text (so blanking a control and
     * saving is the same gesture as clearing it). A save that did not land keeps
     * its drafts so the user can correct it instead of retyping. A landed save
     * that moved the data directory starts the migration poll: the Host
     * relocates as a two-phase commit and the card shows the file progress
     * until it settles.
     *
     * A staged directory edit is vetted through the plugin's guard route
     * before anything writes, and re-checked when the write did not land: the
     * settings wire swallows a refused write (the bound scope recovers
     * silently), so the guard is the only channel that can name the refusal —
     * otherwise the card could only say "did not land".
     */
    private save;
    /**
     * Ask the Host's guard route whether saving this directory would be refused
     * right now; a transport failure stays advisory (the write path's own
     * read-back still governs acceptance).
     * @param path - the staged path text ('' for the clear-to-default gesture).
     * @returns the refusal to show, or undefined when the save may proceed.
     */
    private guard;
    /**
     * Poll the Host's migration endpoint until it answers null (no migration
     * running), publishing each progress step.
     */
    private pollMigration;
    /** Stop the poll timer; the progress line leaves with the next publish. */
    private stopPolling;
    private snapshot;
    /** The raw user layer narrowed to a record; the wire answer is `unknown`. */
    private userLayer;
    private storedValue;
    private stored;
    /** The resolved (draft-free) text of one field; '' means inherited. */
    private effectiveOf;
    /** The effective (draft-or-resolved) text of one field; '' means inherited. */
    private textOf;
    private project;
    /** Replace the snapshot reference and notify, only when the fact moved. */
    private store;
    private publish;
}
//# sourceMappingURL=card-form.d.ts.map