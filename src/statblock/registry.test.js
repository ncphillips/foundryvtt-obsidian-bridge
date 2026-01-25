import StatblockAdapterRegistry from './registry';

describe('StatblockAdapterRegistry', () => {
    beforeEach(() => {
        StatblockAdapterRegistry.clear();
        delete globalThis.game;
    });

    afterEach(() => {
        StatblockAdapterRegistry.clear();
        delete globalThis.game;
    });

    function createValidAdapter(overrides = {}) {
        return {
            isSupported: () => true,
            createActor: async () => ({}),
            updateActor: async () => ({}),
            ...overrides
        };
    }

    describe('register()', () => {
        it('should store adapter', () => {
            const adapter = createValidAdapter();
            StatblockAdapterRegistry.register('dnd5e', adapter);

            expect(StatblockAdapterRegistry.getRegisteredSystems()).toContain('dnd5e');
        });

        it('should throw if systemId is not a string', () => {
            const adapter = createValidAdapter();

            expect(() => StatblockAdapterRegistry.register(null, adapter))
                .toThrow('requires a valid systemId string');
            expect(() => StatblockAdapterRegistry.register(123, adapter))
                .toThrow('requires a valid systemId string');
            expect(() => StatblockAdapterRegistry.register('', adapter))
                .toThrow('requires a valid systemId string');
        });

        it('should throw if adapter is missing', () => {
            expect(() => StatblockAdapterRegistry.register('dnd5e', null))
                .toThrow('requires an adapter');
            expect(() => StatblockAdapterRegistry.register('dnd5e', undefined))
                .toThrow('requires an adapter');
        });

        it('should throw if adapter is missing isSupported method', () => {
            const adapter = {
                createActor: async () => ({}),
                updateActor: async () => ({})
            };

            expect(() => StatblockAdapterRegistry.register('dnd5e', adapter))
                .toThrow('missing required method: isSupported');
        });

        it('should throw if adapter is missing createActor method', () => {
            const adapter = {
                isSupported: () => true,
                updateActor: async () => ({})
            };

            expect(() => StatblockAdapterRegistry.register('dnd5e', adapter))
                .toThrow('missing required method: createActor');
        });

        it('should throw if adapter is missing updateActor method', () => {
            const adapter = {
                isSupported: () => true,
                createActor: async () => ({})
            };

            expect(() => StatblockAdapterRegistry.register('dnd5e', adapter))
                .toThrow('missing required method: updateActor');
        });
    });

    describe('getAdapter()', () => {
        it('should return null when game is undefined', () => {
            StatblockAdapterRegistry.register('dnd5e', createValidAdapter());

            expect(StatblockAdapterRegistry.getAdapter()).toBeNull();
        });

        it('should return null when game.system is undefined', () => {
            globalThis.game = {};
            StatblockAdapterRegistry.register('dnd5e', createValidAdapter());

            expect(StatblockAdapterRegistry.getAdapter()).toBeNull();
        });

        it('should return null when no adapter for current system', () => {
            globalThis.game = { system: { id: 'pf2e' } };
            StatblockAdapterRegistry.register('dnd5e', createValidAdapter());

            expect(StatblockAdapterRegistry.getAdapter()).toBeNull();
        });

        it('should return null when adapter reports unsupported', () => {
            globalThis.game = { system: { id: 'dnd5e' } };
            StatblockAdapterRegistry.register('dnd5e', createValidAdapter({
                isSupported: () => false
            }));

            expect(StatblockAdapterRegistry.getAdapter()).toBeNull();
        });

        it('should return adapter when registered and supported', () => {
            globalThis.game = { system: { id: 'dnd5e' } };
            const adapter = createValidAdapter();
            StatblockAdapterRegistry.register('dnd5e', adapter);

            expect(StatblockAdapterRegistry.getAdapter()).toBe(adapter);
        });
    });

    describe('isAvailable()', () => {
        it('should return false when no adapter available', () => {
            globalThis.game = { system: { id: 'pf2e' } };
            StatblockAdapterRegistry.register('dnd5e', createValidAdapter());

            expect(StatblockAdapterRegistry.isAvailable()).toBe(false);
        });

        it('should return true when adapter is available', () => {
            globalThis.game = { system: { id: 'dnd5e' } };
            StatblockAdapterRegistry.register('dnd5e', createValidAdapter());

            expect(StatblockAdapterRegistry.isAvailable()).toBe(true);
        });
    });

    describe('clear()', () => {
        it('should remove all adapters', () => {
            StatblockAdapterRegistry.register('dnd5e', createValidAdapter());
            StatblockAdapterRegistry.register('pf2e', createValidAdapter());

            expect(StatblockAdapterRegistry.getRegisteredSystems()).toHaveLength(2);

            StatblockAdapterRegistry.clear();

            expect(StatblockAdapterRegistry.getRegisteredSystems()).toHaveLength(0);
        });
    });

    describe('getRegisteredSystems()', () => {
        it('should return empty array when no adapters registered', () => {
            expect(StatblockAdapterRegistry.getRegisteredSystems()).toEqual([]);
        });

        it('should list all registered system IDs', () => {
            StatblockAdapterRegistry.register('dnd5e', createValidAdapter());
            StatblockAdapterRegistry.register('pf2e', createValidAdapter());
            StatblockAdapterRegistry.register('swade', createValidAdapter());

            const systems = StatblockAdapterRegistry.getRegisteredSystems();

            expect(systems).toContain('dnd5e');
            expect(systems).toContain('pf2e');
            expect(systems).toContain('swade');
            expect(systems).toHaveLength(3);
        });
    });
});
