import { FormulaCell, formula, map } from './FormulaCell'
import { cell } from './SourceCell'
import { reset, swap } from '../interfaces/Update'
import { inc, identity, sum, negate } from '../TestUtils'
import { OperationOnDestroyedCellError } from './OperationOnDestroyedCellError'

// @ts-ignore
global.setTimeout = (fn: Function, _?: number) => fn()

describe('FormulaCell', () => {
    it('should be constructable', () => {
        const x = cell<number>(1)
        const y = new FormulaCell(inc, x)
        expect(y.deref()).toBe(2)
    })

    it('should be updated if source value is changed', () => {
        const x = cell<number>(1)
        const y = new FormulaCell(inc, x)
        reset(2, x)
        expect(y.deref()).toBe(3)
    })

    it('should be updated only when source value was changed', async () => {
        const x = cell<number>(1)
        const fn = jest.fn(inc)
        const y = new FormulaCell(fn, x)
        expect(fn).toBeCalledTimes(1)
        reset(1, x)
        expect(fn).toBeCalledTimes(1)
        swap(identity, x)
        expect(fn).toBeCalledTimes(1)

        reset(2, x)
        expect(fn).toBeCalledTimes(2)
        swap(inc, x)
        expect(fn).toBeCalledTimes(3)
    })

    it('multiple sources', async () => {
        const x = cell<number>(1)
        const y = cell<number>(2)
        const fn = jest.fn(sum)
        const z = new FormulaCell(fn, x, y)
        expect(fn).toBeCalledTimes(1)
        expect(z.deref()).toBe(3)
        swap(inc, x)
        expect(fn).toBeCalledTimes(2)
        expect(z.deref()).toBe(4)
        swap(inc, y)
        expect(fn).toBeCalledTimes(3)
        expect(z.deref()).toBe(5)
    })

    it('should generate a formula not only from cells or just values', () => {
        const x = cell<number>(1)
        const y = new FormulaCell(sum, x, 2, 3, 4, 5)
        expect(y.deref()).toBe(15)
    })

    it('should only propagate the event if value is changed', () => {
        const x = cell<number>(1)
        const isEven = jest.fn((x: number) => x % 2 === 0)
        const even = new FormulaCell(isEven, x)
        const isOdd = jest.fn(negate)
        const odd = new FormulaCell(isOdd, even)

        expect(isEven).toBeCalledTimes(1)
        expect(isOdd).toBeCalledTimes(1)

        reset(3, x)

        expect(isEven).toBeCalledTimes(2)
        expect(isOdd).toBeCalledTimes(1)
    })

    it('should trigger the OperationOnDestroyedCellError if dereferenced after destroying', () => {
        const x = cell<number>(1)
        const y = new FormulaCell(inc, x)
        y.destroy()
        try {
            y.deref()
            fail('Error should be triggered')
        } catch (err) {
            expect(err).toBeInstanceOf(OperationOnDestroyedCellError)
        }
    })

    it('should trigger the OperationOnDestroyedCellError if subscribed after destroying', () => {
        const x = cell<number>(1)
        const y = new FormulaCell(inc, x)
        y.destroy()
        try {
            const z = new FormulaCell(inc, y)
            fail('Error should be triggered')
        } catch (err) {
            expect(err).toBeInstanceOf(OperationOnDestroyedCellError)
        }
    })

    it('all subscribers should be notified', () => {
        const x = cell<number>(1)
        const y = new FormulaCell(inc, x)
        const fn = jest.fn()
        const z = new FormulaCell(fn, y)
        reset(2, x)
        expect(fn).toBeCalledTimes(2)
    })

    it('formula should create an instance of FormulaCell', () => {
        const x = cell<number>(1)
        const y = formula(inc, x)
        expect(y).toBeInstanceOf(FormulaCell)
    })

    it('map should create an instance of FormulaCell', () => {
        const x = cell<number>(1)
        const y = map(inc, x)
        expect(y).toBeInstanceOf(FormulaCell)
    })

    it('should use equals function to check should the update be propagated', () => {
        const x = cell<number>(1)
        const equals = jest.fn(() => false)
        const y = map((x) => ({ equals, y: inc(x) }), x)
        reset(2, x)
        expect(equals).toBeCalled()
        expect(y.deref().y).toBe(3)
    })
})
