import { describe, expect, it } from "vitest";
import { Validations } from "../src/lib";

const MIN_DATE = new Date(-8640000000000000);
const INVALID_DATE = new Date(NaN);

const daysFromToday = (days: number) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return date;
};

describe("Validations.IsNil", () => {
    it.each([
        ["null", null, true],
        ["undefined", undefined, true],
        ["an empty string", "", false],
        ["zero", 0, false],
        ["false", false, false],
    ])("should return %s -> %s when the value is %s", (_label, value, expected) => {
        expect(Validations.IsNil(value)).toBe(expected);
    });

    it("should be the inverse of IsNil when IsNotNil is called", () => {
        expect(Validations.IsNotNil(null)).toBe(false);
    });
});

describe("Validations.IsTextEmpty", () => {
    it.each([
        [null, true],
        [undefined, true],
        ["", true],
        [" ", false],
        ["text", false],
    ])("should return %s for %s", (value, expected) => {
        expect(Validations.IsTextEmpty(value)).toBe(expected);
    });

    it("should return the opposite result when IsTextNotEmpty is called", () => {
        expect(Validations.IsTextNotEmpty("text")).toBe(true);
    });
});

describe("Validations.IsTextEmptyOrWhitespace", () => {
    it.each([
        [null, true],
        [undefined, true],
        ["", true],
        [" ", true],
        ["\t\n\r", true],
        [" ", true],
        [" ", true],
        [" x ", false],
        ["text", false],
    ])("should return %s for %s", (value, expected) => {
        expect(Validations.IsTextEmptyOrWhitespace(value)).toBe(expected);
    });

    it("should return the opposite result when IsTextNotEmptyOrWhitespace is called", () => {
        expect(Validations.IsTextNotEmptyOrWhitespace("   x")).toBe(true);
    });
});

describe("Validations.IsArrayEmpty", () => {
    it.each([
        ["null", null, true],
        ["undefined", undefined, true],
        ["an empty array", [], true],
        ["a populated array", [1], false],
    ])("should return %s -> %s for %s", (_label, value, expected) => {
        expect(Validations.IsArrayEmpty(value)).toBe(expected);
    });

    it("should return the opposite result when IsArrayNotEmpty is called", () => {
        expect(Validations.IsArrayNotEmpty([1])).toBe(true);
    });
});

describe("Validations.IsDateEmpty", () => {
    it("should return true when the value is null", () => {
        expect(Validations.IsDateEmpty(null)).toBe(true);
    });

    it("should return true when the date is invalid", () => {
        expect(Validations.IsDateEmpty(INVALID_DATE)).toBe(true);
    });

    it("should return true when the date is the minimum sentinel value", () => {
        expect(Validations.IsDateEmpty(MIN_DATE)).toBe(true);
    });

    it("should return false when the date is a real date", () => {
        expect(Validations.IsDateEmpty(new Date(2020, 0, 1))).toBe(false);
    });

    it("should return the opposite result when IsDateNotEmpty is called", () => {
        expect(Validations.IsDateNotEmpty(new Date(2020, 0, 1))).toBe(true);
    });
});

describe("Validations.IsInvalidDate", () => {
    it("should return true when the date has a NaN time", () => {
        expect(Validations.IsInvalidDate(INVALID_DATE)).toBe(true);
    });

    it("should return false when the value is null", () => {
        expect(Validations.IsInvalidDate(null)).toBe(false);
    });
});

describe("Validations – date comparisons", () => {
    it("should return true when the value is before the reference date", () => {
        expect(Validations.IsBefore(new Date(2020, 0, 1), new Date(2021, 0, 1))).toBe(true);
    });

    it("should return false when the value is null", () => {
        expect(Validations.IsBefore(null, new Date(2021, 0, 1))).toBe(false);
    });

    it("should return false when the value is an invalid date", () => {
        expect(Validations.IsBefore(INVALID_DATE, new Date(2021, 0, 1))).toBe(false);
    });

    it("should return true when the value is after the reference date", () => {
        expect(Validations.IsAfter(new Date(2022, 0, 1), new Date(2021, 0, 1))).toBe(true);
    });

    it("should return true when the value sits on the range boundary and IsDateBetween is called", () => {
        const from = new Date(2021, 0, 1);

        expect(Validations.IsDateBetween(from, from, new Date(2022, 0, 1))).toBe(true);
    });

    it("should return true when the value sits outside the range and IsDateNotBetween is called", () => {
        expect(Validations.IsDateNotBetween(new Date(2020, 0, 1), new Date(2021, 0, 1), new Date(2022, 0, 1))).toBe(true);
    });

    it("should return true when the date is in the past", () => {
        expect(Validations.IsInThePast(new Date(Date.now() - 1000))).toBe(true);
    });

    it("should return true when the date is in the future", () => {
        expect(Validations.IsInTheFuture(new Date(Date.now() + 60_000))).toBe(true);
    });

    it("should return true when the date is yesterday and IsBeforeToday is called", () => {
        expect(Validations.IsBeforeToday(daysFromToday(-1))).toBe(true);
    });

    it("should return false when the date is today and IsBeforeToday is called", () => {
        expect(Validations.IsBeforeToday(daysFromToday(0))).toBe(false);
    });

    it("should return true when the date is tomorrow and IsAfterToday is called", () => {
        expect(Validations.IsAfterToday(daysFromToday(1))).toBe(true);
    });

    it("should return false when the date is today and IsAfterToday is called", () => {
        expect(Validations.IsAfterToday(daysFromToday(0))).toBe(false);
    });

    it("should return true when the date is today and IsToday is called", () => {
        expect(Validations.IsToday(daysFromToday(0))).toBe(true);
    });

    it("should return false when the date is tomorrow and IsToday is called", () => {
        expect(Validations.IsToday(daysFromToday(1))).toBe(false);
    });

    it.each([
        ["IsBefore", () => Validations.IsBefore(null, new Date())],
        ["IsAfter", () => Validations.IsAfter(null, new Date())],
        ["IsDateBetween", () => Validations.IsDateBetween(null, new Date(), new Date())],
        ["IsDateNotBetween", () => Validations.IsDateNotBetween(null, new Date(), new Date())],
        ["IsInThePast", () => Validations.IsInThePast(null)],
        ["IsInTheFuture", () => Validations.IsInTheFuture(null)],
        ["IsBeforeToday", () => Validations.IsBeforeToday(null)],
        ["IsAfterToday", () => Validations.IsAfterToday(null)],
        ["IsToday", () => Validations.IsToday(null)],
    ])("should return false when the value is null and %s is called", (_label, check) => {
        expect(check()).toBe(false);
    });

    it.each([
        ["IsBeforeToday", () => Validations.IsBeforeToday(INVALID_DATE)],
        ["IsAfterToday", () => Validations.IsAfterToday(INVALID_DATE)],
        ["IsToday", () => Validations.IsToday(INVALID_DATE)],
        ["IsInThePast", () => Validations.IsInThePast(INVALID_DATE)],
        ["IsInTheFuture", () => Validations.IsInTheFuture(INVALID_DATE)],
    ])("should return false when the date is invalid and %s is called", (_label, check) => {
        expect(check()).toBe(false);
    });
});

describe("Validations – length checks", () => {
    it("should return true when the string is shorter than the minimum", () => {
        expect(Validations.IsShorterThan("ab", 3)).toBe(true);
    });

    it("should return true when the array is shorter than the minimum", () => {
        expect(Validations.IsShorterThan([1, 2], 3)).toBe(true);
    });

    it("should return false when the value is null and IsShorterThan is called", () => {
        expect(Validations.IsShorterThan(null, 3)).toBe(false);
    });

    it("should return true when the string is longer than the maximum", () => {
        expect(Validations.IsLongerThan("abcd", 3)).toBe(true);
    });

    it("should return false when the value is null and IsLongerThan is called", () => {
        expect(Validations.IsLongerThan(null, 3)).toBe(false);
    });
});

describe("Validations – substring checks", () => {
    it("should return true when the value contains the search text", () => {
        expect(Validations.Contains("hello world", "world")).toBe(true);
    });

    it("should return false when the value is null and Contains is called", () => {
        expect(Validations.Contains(null, "world")).toBe(false);
    });

    it("should return true when the value does not contain the search text", () => {
        expect(Validations.DoesNotContain("hello", "world")).toBe(true);
    });

    it("should return false when the value is null and DoesNotContain is called", () => {
        expect(Validations.DoesNotContain(null, "world")).toBe(false);
    });
});

describe("Validations – numeric checks", () => {
    it.each([
        ["IsLessThan", () => Validations.IsLessThan(4, 5), true],
        ["IsLessThan at the boundary", () => Validations.IsLessThan(5, 5), false],
        ["IsLessOrEqualThan at the boundary", () => Validations.IsLessOrEqualThan(5, 5), true],
        ["IsGreaterThan", () => Validations.IsGreaterThan(6, 5), true],
        ["IsGreaterThan at the boundary", () => Validations.IsGreaterThan(5, 5), false],
        ["IsGreaterOrEqualThan at the boundary", () => Validations.IsGreaterOrEqualThan(5, 5), true],
        ["IsBetween inside the range", () => Validations.IsBetween(5, 1, 10), true],
        ["IsBetween on the lower bound", () => Validations.IsBetween(1, 1, 10), true],
        ["IsBetween outside the range", () => Validations.IsBetween(11, 1, 10), false],
        ["IsNotBetween outside the range", () => Validations.IsNotBetween(11, 1, 10), true],
        ["IsNotBetween on the bound", () => Validations.IsNotBetween(10, 1, 10), false],
    ])("should return %s -> %s", (_label, check, expected) => {
        expect(check()).toBe(expected);
    });

    it.each([
        ["IsLessThan", () => Validations.IsLessThan(null, 5)],
        ["IsLessOrEqualThan", () => Validations.IsLessOrEqualThan(null, 5)],
        ["IsGreaterThan", () => Validations.IsGreaterThan(null, 5)],
        ["IsGreaterOrEqualThan", () => Validations.IsGreaterOrEqualThan(null, 5)],
        ["IsBetween", () => Validations.IsBetween(null, 1, 10)],
        ["IsNotBetween", () => Validations.IsNotBetween(null, 1, 10)],
    ])("should return false when the value is null and %s is called", (_label, check) => {
        expect(check()).toBe(false);
    });

    it("should return false when the value is zero and IsLessThan is called with zero", () => {
        expect(Validations.IsLessThan(0, 0)).toBe(false);
    });

    it("should treat zero as a real value when IsGreaterOrEqualThan is called", () => {
        expect(Validations.IsGreaterOrEqualThan(0, 0)).toBe(true);
    });
});

describe("Validations.DoesNotMatch", () => {
    it("should return true when the value does not match the pattern", () => {
        expect(Validations.DoesNotMatch("abc", /^\d+$/)).toBe(true);
    });

    it("should return false when the value matches the pattern", () => {
        expect(Validations.DoesNotMatch("123", /^\d+$/)).toBe(false);
    });

    it("should return false when the value is null", () => {
        expect(Validations.DoesNotMatch(null, /^\d+$/)).toBe(false);
    });
});
