
// Utility to prevent fetch from hanging indefinitely
export const withTimeout = <T,>(promise: Promise<T>, ms: number, name: string): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${name} timed out after ${ms}ms`)), ms))
    ]);
};
