import { toString } from './utils.js';
import { Result, Ok, Err } from './result.js';

interface BaseOption<T> extends Iterable<T extends Iterable<infer U> ? U : never> {
    /** `true` when the Option is Some */ readonly some: boolean;
    /** `true` when the Option is None */ readonly none: boolean;

    /**
     * Returns the contained `Some` value, if exists.  Throws an error if not.
     *
     * If you know you're dealing with `Some` and the compiler knows it too (because you tested
     * `some` or `none`) you should use `val` instead. While `Some`'s `expect()` and `val` will
     * both return the same value using `val` is preferable because it makes it clear that
     * there won't be an exception thrown on access.
     *
     * @param msg the message to throw if no Some value.
     */
    expect(msg: string): T;

    /**
     * Returns the contained `Some` value.
     * Because this function may throw, its use is generally discouraged.
     * Instead, prefer to handle the `None` case explicitly.
     *
     * If you know you're dealing with `Some` and the compiler knows it too (because you tested
     * `some` or `none`) you should use `val` instead. While `Some`'s `unwrap()` and `val` will
     * both return the same value using `val` is preferable because it makes it clear that
     * there won't be an exception thrown on access.
     *
     * Throws if the value is `None`.
     */
    unwrap(): T;

    /**
     * Returns the contained `Some` value or a provided default.
     *
     *  (This is the `unwrap_or` in rust)
     */
    unwrapOr<T2>(val: T2): T | T2;

    /**
     * Calls `mapper` if the Option is `Some`, otherwise returns `None`.
     * This function can be used for control flow based on `Option` values.
     */
    andThen<T2>(mapper: (val: T) => Option<T2>): Option<T2>;

    /**
     * Maps an `Option<T>` to `Option<U>` by applying a function to a contained `Some` value,
     * leaving a `None` value untouched.
     *
     * This function can be used to compose the Options of two functions.
     */
    map<U>(mapper: (val: T) => U): Option<U>;

    /**
     * Maps an `Option<T>` to `Option<U>` by either converting `T` to `U` using `mapper` (in case
     * of `Some`) or using the `default_` value (in case of `None`).
     *
     * If `default` is a result of a function call consider using `mapOrElse` instead, it will
     * only evaluate the function when needed.
     */
    mapOr<U>(default_: U, mapper: (val: T) => U): U;

    /**
     * Maps an `Option<T>` to `Option<U>` by either converting `T` to `U` using `mapper` (in case
     * of `Some`) or producing a default value using the `default` function (in case of `None`).
     */
    mapOrElse<U>(default_: () => U, mapper: (val: T) => U): U;

    /**
     * Returns `Some()` if we have a value, otherwise returns `other`.
     * 
     * `other` is evaluated eagerly. If `other` is a result of a function
     * call try `or_else()` instead – it evaluates the parameter lazily.
     * 
     * @example
     * 
     * Some(1).or(Some(2)) // => Some(1)
     * None.or(Some(2)) // => Some(2) 
     */
    or(other: Option<T>): Option<T>

    /**
     * Returns `Some()` if we have a value, otherwise returns the result
     * of calling `other()`.
     * 
     * `other()` is called *only* when needed.
     * 
     * @example
     * 
     * Some(1).orElse(() => Some(2)) // => Some(1)
     * None.orElse(() => Some(2)) // => Some(2) 
     */
    orElse(other: () => Option<T>): Option<T>

    /**
     * Maps an `Option<T>` to a `Result<T, E>`.
     */
    toResult<E>(error: E): Result<T, E>;
}

/**
 * Contains the None value
 */
class NoneImpl implements BaseOption<never> {
    readonly some = false;
    readonly none = true;

    [Symbol.iterator](): Iterator<never, never, any> {
        return {
            next(): IteratorResult<never, never> {
                return { done: true, value: undefined! };
            },
        };
    }

    unwrapOr<T2>(val: T2): T2 {
        return val;
    }

    expect(msg: string): never {
        throw new Error(`${msg}`);
    }

    unwrap(): never {
        throw new Error(`Tried to unwrap None`);
    }

    map<T2>(_mapper: unknown): None {
        return this;
    }

    mapOr<T2>(default_: T2, _mapper: unknown): T2 {
        return default_;
    }

    mapOrElse<U>(default_: () => U, _mapper: unknown): U {
        return default_();
    }

    or<T>(other: Option<T>): Option<T> {
        return other;
    }

    orElse<T>(other: () => Option<T>): Option<T> {
        return other();
    }

    andThen<T2>(op: unknown): None {
        return this;
    }

    toResult<E>(error: E): Err<E> {
        return Err(error);
    }

    toString(): string {
        return 'None';
    }
}

// Export None as a singleton, then freeze it so it can't be modified
export const None = new NoneImpl();
export type None = NoneImpl;
Object.freeze(None);

/**
 * Contains the success value
 */
class SomeImpl<T> implements BaseOption<T> {
    static readonly EMPTY = new SomeImpl<void>(undefined);

    readonly some!: true;
    readonly none!: false;
    readonly val!: T;

    /**
     * Helper function if you know you have an Some<T> and T is iterable
     */
    [Symbol.iterator](): Iterator<T extends Iterable<infer U> ? U : never> {
        const obj = Object(this.val) as Iterable<any>;

        return Symbol.iterator in obj
            ? obj[Symbol.iterator]()
            : {
                  next(): IteratorResult<never, never> {
                      return { done: true, value: undefined! };
                  },
              };
    }

    constructor(val: T) {
        if (!(this instanceof SomeImpl)) {
            return new SomeImpl(val);
        }

        this.some = true;
        this.none = false;
        this.val = val;
    }

    unwrapOr(_val: unknown): T {
        return this.val;
    }

    expect(_msg: string): T {
        return this.val;
    }

    unwrap(): T {
        return this.val;
    }

    map<T2>(mapper: (val: T) => T2): Some<T2> {
        return Some(mapper(this.val));
    }

    mapOr<T2>(_default_: T2, mapper: (val: T) => T2): T2 {
        return mapper(this.val);
    }

    mapOrElse<U>(_default_: () => U, mapper: (val: T) => U): U {
        return mapper(this.val);
    }

    or(_other: Option<T>): Option<T> {
        return this;
    }

    orElse(_other: () => Option<T>): Option<T> {
        return this;
    }

    andThen<T2>(mapper: (val: T) => Option<T2>): Option<T2> {
        return mapper(this.val);
    }

    toResult<E>(error: E): Ok<T> {
        return Ok(this.val);
    }

    /**
     * Returns the contained `Some` value, but never throws.
     * Unlike `unwrap()`, this method doesn't throw and is only callable on an Some<T>
     *
     * Therefore, it can be used instead of `unwrap()` as a maintainability safeguard
     * that will fail to compile if the type of the Option is later changed to a None that can actually occur.
     *
     * (this is the `into_Some()` in rust)
     */
    safeUnwrap(): T {
        return this.val;
    }

    toString(): string {
        return `Some(${toString(this.val)})`;
    }
}

// This allows Some to be callable - possible because of the es5 compilation target
export const Some = SomeImpl as typeof SomeImpl & (<T>(val: T) => SomeImpl<T>);
export type Some<T> = SomeImpl<T>;

export type Option<T> = Some<T> | None;

export type OptionSomeType<T extends Option<any>> = T extends Some<infer U> ? U : never;

export type OptionSomeTypes<T extends Option<any>[]> = {
    [key in keyof T]: T[key] extends Option<any> ? OptionSomeType<T[key]> : never;
};

export namespace Option {
    /**
     * Parse a set of `Option`s, returning an array of all `Some` values.
     * Short circuits with the first `None` found, if any
     */
    export function all<T extends Option<any>[]>(...options: T): Option<OptionSomeTypes<T>> {
        const someOption = [];
        for (let option of options) {
            if (option.some) {
                someOption.push(option.val);
            } else {
                return option as None;
            }
        }

        return Some(someOption as OptionSomeTypes<T>);
    }

    /**
     * Parse a set of `Option`s, short-circuits when an input value is `Some`.
     * If no `Some` is found, returns `None`.
     */
    export function any<T extends Option<any>[]>(...options: T): Option<OptionSomeTypes<T>[number]> {
        // short-circuits
        for (const option of options) {
            if (option.some) {
                return option as Some<OptionSomeTypes<T>[number]>;
            } else {
                return option as None;
            }
        }

        // it must be None
        return None;
    }

    export function isOption<T = any>(value: unknown): value is Option<T> {
        return value instanceof Some || value === None;
    }

    export function of<T>(value: T | null | undefined): Option<T> {
        return value === null || value === undefined ? None : Some(value);
    }
}
