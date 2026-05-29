/**
 * Static helpers for common checks used inside validation rules.
 *
 * **Null-safety convention for parameterized checks:**
 * {@link IsShorterThan}, {@link IsLongerThan}, {@link IsLessThan},
 * {@link IsGreaterThan}, {@link IsBefore}, {@link IsAfter},
 * and {@link DoesNotMatch} all return `false`
 * for `null`/`undefined` values. Pair them with a separate nil/empty
 * check and `stop: true` to handle the required case first:
 *
 * @example
 * b.validationFor("name")
 *   .add({ check: ctx => Validations.IsTextEmpty(ctx.value), message: "Required", stop: true })
 *   .add({ check: ctx => Validations.IsShorterThan(ctx.value, 3), message: "Min 3 characters" });
 */
export class Validations
{
    // ── Nil checks ──────────────────────────────────────────────────────

    /** Returns `true` when `value` is `null` or `undefined`. */
    public static readonly IsNil = (value: any): boolean => value == null;

    /** Returns `true` when `value` is not `null` and not `undefined`. Inverse of {@link IsNil}. */
    public static readonly IsNotNil = (value: any): boolean => value != null;

    // ── Text-specific checks ────────────────────────────────────────────

    /**
     * Returns `true` when `value` is `null`, `undefined`, or `""`.
     *
     * Lightweight check for string fields — does not check
     * Date, Array, Object, or boolean values.
     */
    public static readonly IsTextEmpty = (value: string | null | undefined): boolean =>
        value == null || value === "";

    /** Returns `true` when `value` is a non-empty string. Inverse of {@link IsTextEmpty}. */
    public static readonly IsTextNotEmpty = (value: string | null | undefined): boolean =>
        value != null && value !== "";

    /**
     * Returns `true` when `value` is `null`, `undefined`, `""`,
     * or contains only whitespace characters.
     *
     * Does **not** allocate a new string (unlike `trim()`), exits
     * early on the first non-whitespace character.
     *
     * Use instead of {@link IsTextEmpty} when user input should not
     * pass validation with just spaces, tabs, or newlines.
     */
    public static readonly IsTextEmptyOrWhitespace = (value: string | null | undefined): boolean => {
        if (value == null || value.length === 0) return true;
        for (let i = 0; i < value.length; i++) {
            const c = value.charCodeAt(i);
            // space, tab, newline, carriage return, form feed, vertical tab,
            // non-breaking space, and Unicode whitespace range
            if (c !== 32 && c !== 9 && c !== 10 && c !== 13 && c !== 12 && c !== 11 && c !== 160 && (c < 8192 || c > 8202)) {
                return false;
            }
        }
        return true;
    }

    /** Returns `true` when `value` has at least one non-whitespace character. Inverse of {@link IsTextEmptyOrWhitespace}. */
    public static readonly IsTextNotEmptyOrWhitespace = (value: string | null | undefined): boolean =>
        !Validations.IsTextEmptyOrWhitespace(value);

    // ── Array-specific checks ───────────────────────────────────────────

    /**
     * Returns `true` when `value` is `null`, `undefined`, or an empty array (`[]`).
     *
     * Lightweight alternative for array fields.
     */
    public static readonly IsArrayEmpty = (value: any[] | null | undefined): boolean =>
        value == null || value.length === 0;

    /** Returns `true` when `value` is a non-empty array. Inverse of {@link IsArrayEmpty}. */
    public static readonly IsArrayNotEmpty = (value: any[] | null | undefined): boolean =>
        value != null && value.length > 0;

    // ── Date-specific empty check ───────────────────────────────────────

    /**
     * Returns `true` when `value` is `null`, `undefined`, an invalid date,
     * or the minimum Date value (`-8640000000000000`) used as an empty sentinel.
     */
    public static readonly IsDateEmpty = (value: Date | null | undefined): boolean =>
        value == null || isNaN(value.getTime()) || value.valueOf() === -8640000000000000;

    /** Returns `true` when `value` is a valid, non-sentinel date. Inverse of {@link IsDateEmpty}. */
    public static readonly IsDateNotEmpty = (value: Date | null | undefined): boolean =>
        value != null && !isNaN(value.getTime()) && value.valueOf() !== -8640000000000000;

    // ── Length checks (strings and arrays) ──────────────────────────────

    /**
     * Returns `true` when `value` has fewer than `min` characters (string)
     * or items (array). Returns `false` for `null`/`undefined`.
     */
    public static readonly IsShorterThan = (value: string | any[] | null | undefined, min: number): boolean =>
        value != null && value.length < min;

    /**
     * Returns `true` when `value` has more than `max` characters (string)
     * or items (array). Returns `false` for `null`/`undefined`.
     */
    public static readonly IsLongerThan = (value: string | any[] | null | undefined, max: number): boolean =>
        value != null && value.length > max;

    // ── Substring checks ───────────────────────────────────────────────

    /**
     * Returns `true` when `value` contains `search`.
     * Returns `false` for `null`/`undefined`.
     */
    public static readonly Contains = (value: string | null | undefined, search: string): boolean =>
        value != null && value.includes(search);

    /**
     * Returns `true` when `value` does **not** contain `search`.
     * Returns `false` for `null`/`undefined`.
     */
    public static readonly DoesNotContain = (value: string | null | undefined, search: string): boolean =>
        value != null && !value.includes(search);

    // ── Numeric range checks ────────────────────────────────────────────

    /**
     * Returns `true` when `value` is strictly less than `min`.
     * Returns `false` for `null`/`undefined`.
     */
    public static readonly IsLessThan = (value: number | null | undefined, min: number): boolean =>
        value != null && value < min;

    /**
     * Returns `true` when `value` is less than or equal to `max`.
     * Returns `false` for `null`/`undefined`.
     */
    public static readonly IsLessOrEqualThan = (value: number | null | undefined, max: number): boolean =>
        value != null && value <= max;

    /**
     * Returns `true` when `value` is strictly greater than `max`.
     * Returns `false` for `null`/`undefined`.
     */
    public static readonly IsGreaterThan = (value: number | null | undefined, max: number): boolean =>
        value != null && value > max;

    /**
     * Returns `true` when `value` is greater than or equal to `min`.
     * Returns `false` for `null`/`undefined`.
     */
    public static readonly IsGreaterOrEqualThan = (value: number | null | undefined, min: number): boolean =>
        value != null && value >= min;

    /**
     * Returns `true` when `value` is between `min` and `max` (inclusive).
     * Returns `false` for `null`/`undefined`.
     */
    public static readonly IsBetween = (value: number | null | undefined, min: number, max: number): boolean =>
        value != null && value >= min && value <= max;

    /**
     * Returns `true` when `value` is outside the `min`–`max` range (exclusive).
     * Returns `false` for `null`/`undefined`.
     */
    public static readonly IsNotBetween = (value: number | null | undefined, min: number, max: number): boolean =>
        value != null && (value < min || value > max);

    // ── Date checks ─────────────────────────────────────────────────────

    /**
     * Returns `true` when `value` is a `Date` with an invalid time value (`NaN`).
     * Returns `false` for `null`/`undefined`.
     */
    public static readonly IsInvalidDate = (value: Date | null | undefined): boolean =>
        value != null && isNaN(value.getTime());

    /**
     * Returns `true` when `value` is strictly before `date`.
     * Returns `false` for `null`/`undefined` or invalid dates.
     */
    public static readonly IsBefore = (value: Date | null | undefined, date: Date): boolean =>
        value != null && !isNaN(value.getTime()) && value < date;

    /**
     * Returns `true` when `value` is strictly after `date`.
     * Returns `false` for `null`/`undefined` or invalid dates.
     */
    public static readonly IsAfter = (value: Date | null | undefined, date: Date): boolean =>
        value != null && !isNaN(value.getTime()) && value > date;

    /**
     * Returns `true` when `value` falls between `from` and `to` (inclusive).
     * Returns `false` for `null`/`undefined` or invalid dates.
     */
    public static readonly IsDateBetween = (value: Date | null | undefined, from: Date, to: Date): boolean =>
        value != null && !isNaN(value.getTime()) && value >= from && value <= to;

    /**
     * Returns `true` when `value` is outside the `from`–`to` range (exclusive).
     * Returns `false` for `null`/`undefined` or invalid dates.
     */
    public static readonly IsDateNotBetween = (value: Date | null | undefined, from: Date, to: Date): boolean =>
        value != null && !isNaN(value.getTime()) && (value < from || value > to);

    /**
     * Returns `true` when `value` is strictly in the past (before `Date.now()`).
     * Compares with **millisecond** precision.
     * Returns `false` for `null`/`undefined` or invalid dates.
     *
     * For date-only (no time) comparisons, use {@link IsBeforeToday}.
     */
    public static readonly IsInThePast = (value: Date | null | undefined): boolean =>
        value != null && !isNaN(value.getTime()) && value.getTime() < Date.now();

    /**
     * Returns `true` when `value` is strictly in the future (after `Date.now()`).
     * Compares with **millisecond** precision.
     * Returns `false` for `null`/`undefined` or invalid dates.
     *
     * For date-only (no time) comparisons, use {@link IsAfterToday}.
     */
    public static readonly IsInTheFuture = (value: Date | null | undefined): boolean =>
        value != null && !isNaN(value.getTime()) && value.getTime() > Date.now();

    /**
     * Returns `true` when `value` is a date before today (ignores time component).
     * Comparison is performed in the **local timezone** of the runtime.
     * Returns `false` for `null`/`undefined` or invalid dates.
     *
     * @example
     * // "Date of birth cannot be today or in the future"
     * check: ctx => !Validations.IsBeforeToday(ctx.value)
     */
    public static readonly IsBeforeToday = (value: Date | null | undefined): boolean => {
        if (value == null || isNaN(value.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return value < today;
    }

    /**
     * Returns `true` when `value` is a date after today (ignores time component).
     * "After today" means the date is **tomorrow or later**.
     * Comparison is performed in the **local timezone** of the runtime.
     * Returns `false` for `null`/`undefined` or invalid dates.
     *
     * @example
     * // "Expiry date must be in the future"
     * check: ctx => !Validations.IsAfterToday(ctx.value)
     */
    public static readonly IsAfterToday = (value: Date | null | undefined): boolean => {
        if (value == null || isNaN(value.getTime())) return false;
        const tomorrow = new Date();
        tomorrow.setHours(0, 0, 0, 0);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return value >= tomorrow;
    }

    /**
     * Returns `true` when `value` is today's date (ignores time component).
     * Comparison is performed in the **local timezone** of the runtime.
     * Returns `false` for `null`/`undefined` or invalid dates.
     */
    public static readonly IsToday = (value: Date | null | undefined): boolean => {
        if (value == null || isNaN(value.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return value >= today && value < tomorrow;
    }

    // ── Pattern matching ────────────────────────────────────────────────

    /**
     * Returns `true` when `value` does **not** match `pattern`.
     * Returns `false` for `null`/`undefined`.
     */
    public static readonly DoesNotMatch = (value: string | null | undefined, pattern: RegExp): boolean =>
        value != null && !pattern.test(value);
}
