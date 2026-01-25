import { parseAttackAction, parseSaveAction, parseRecharge, parseTargeting, parseDamageFromDescription, parseReactionTrigger, isMultiattack, extractWeaponName } from './actionParser.js';

describe('actionParser', () => {
    describe('parseAttackAction', () => {
        it('returns non-attack for empty description', () => {
            const result = parseAttackAction('');
            expect(result.isAttack).toBe(false);
        });

        it('returns non-attack for non-attack description', () => {
            const result = parseAttackAction('The creature takes the Disengage or Hide action.');
            expect(result.isAttack).toBe(false);
        });

        it('parses melee weapon attack', () => {
            const desc = '_Melee Weapon Attack:_ +5 to hit, reach 10 ft., one target. _Hit:_ 10 (2d6 + 3) piercing damage.';
            const result = parseAttackAction(desc);

            expect(result.isAttack).toBe(true);
            expect(result.isMelee).toBe(true);
            expect(result.isRanged).toBe(false);
            expect(result.isWeapon).toBe(true);
            expect(result.attackBonus).toBe(5);
            expect(result.reach).toBe(10);
            expect(result.damageFormula).toBe('2d6+3');
            expect(result.damageType).toBe('piercing');
        });

        it('parses ranged weapon attack', () => {
            const desc = '_Ranged Weapon Attack:_ +7 to hit, range 15/30., one target. _Hit:_ 11 (2d6 + 4) bludgeoning damage.';
            const result = parseAttackAction(desc);

            expect(result.isAttack).toBe(true);
            expect(result.isMelee).toBe(false);
            expect(result.isRanged).toBe(true);
            expect(result.isWeapon).toBe(true);
            expect(result.attackBonus).toBe(7);
            expect(result.range).toBe(15);
            expect(result.longRange).toBe(30);
            expect(result.damageFormula).toBe('2d6+4');
            expect(result.damageType).toBe('bludgeoning');
        });

        it('parses melee or ranged weapon attack', () => {
            const desc = '_Melee or Ranged Weapon Attack:_ +5 to hit, reach 10 ft. or range 30/120 ft., one target. _Hit:_ 10 (2d6 + 3) piercing damage.';
            const result = parseAttackAction(desc);

            expect(result.isAttack).toBe(true);
            expect(result.isMelee).toBe(true);
            expect(result.isRanged).toBe(true);
            expect(result.isWeapon).toBe(true);
            expect(result.attackBonus).toBe(5);
            expect(result.reach).toBe(10);
            expect(result.range).toBe(30);
            expect(result.longRange).toBe(120);
        });

        it('parses melee attack without "Weapon" keyword', () => {
            const desc = '_Melee Attack:_ +6, reach 5 ft. _Hit:_ 16 (3d8 + 3) force damage.';
            const result = parseAttackAction(desc);

            expect(result.isAttack).toBe(true);
            expect(result.isMelee).toBe(true);
            expect(result.isWeapon).toBe(false);
            expect(result.attackBonus).toBe(6);
            expect(result.damageType).toBe('force');
        });

        it('parses attack roll variant', () => {
            const desc = '_Melee or Ranged Attack Roll:_ +11 to hit, reach 5 ft. or range 120 ft. _Hit:_ 25 (4d8 + 7) force damage.';
            const result = parseAttackAction(desc);

            expect(result.isAttack).toBe(true);
            expect(result.isMelee).toBe(true);
            expect(result.isRanged).toBe(true);
            expect(result.attackBonus).toBe(11);
        });
    });

    describe('isMultiattack', () => {
        it('returns true for Multiattack action', () => {
            expect(isMultiattack({ name: 'Multiattack' })).toBe(true);
            expect(isMultiattack({ name: 'Multiattack (Recharge 5-6)' })).toBe(true);
        });

        it('returns false for non-multiattack actions', () => {
            expect(isMultiattack({ name: 'Longsword' })).toBe(false);
            expect(isMultiattack({ name: 'Bite' })).toBe(false);
        });

        it('returns false for null/undefined', () => {
            expect(isMultiattack(null)).toBe(false);
            expect(isMultiattack(undefined)).toBe(false);
            expect(isMultiattack({})).toBe(false);
        });
    });

    describe('extractWeaponName', () => {
        it('extracts simple weapon name', () => {
            expect(extractWeaponName('Longsword')).toBe('Longsword');
            expect(extractWeaponName('Javelin')).toBe('Javelin');
        });

        it('removes parenthetical notes', () => {
            expect(extractWeaponName('Javelin (3)')).toBe('Javelin');
            expect(extractWeaponName('Morningstar (Recharge 5-6)')).toBe('Morningstar');
        });

        it('handles empty input', () => {
            expect(extractWeaponName('')).toBe('');
            expect(extractWeaponName(null)).toBe('');
        });
    });

    describe('parseSaveAction', () => {
        it('returns non-save for empty description', () => {
            const result = parseSaveAction('');
            expect(result.isSave).toBe(false);
        });

        it('returns non-save for non-save description', () => {
            const result = parseSaveAction('The creature teleports up to 30 feet.');
            expect(result.isSave).toBe(false);
        });

        it('parses Fantasy Statblocks save format', () => {
            const desc = '_Dexterity Saving Throw:_ DC 16, one medium or smaller creature. _Failure:_ The target is Grappled.';
            const result = parseSaveAction(desc);

            expect(result.isSave).toBe(true);
            expect(result.ability).toBe('dex');
            expect(result.dc).toBe(16);
        });

        it('parses DC-first save format', () => {
            const desc = 'The target must make a DC 15 Constitution saving throw or be poisoned.';
            const result = parseSaveAction(desc);

            expect(result.isSave).toBe(true);
            expect(result.ability).toBe('con');
            expect(result.dc).toBe(15);
        });

        it('parses parenthetical DC format', () => {
            const desc = 'Each creature must succeed on a Wisdom saving throw (DC 14) or be frightened.';
            const result = parseSaveAction(desc);

            expect(result.isSave).toBe(true);
            expect(result.ability).toBe('wis');
            expect(result.dc).toBe(14);
        });

        it('parses abbreviated save format', () => {
            const desc = 'A creature can make a DC 12 Strength save to end the effect.';
            const result = parseSaveAction(desc);

            expect(result.isSave).toBe(true);
            expect(result.ability).toBe('str');
            expect(result.dc).toBe(12);
        });
    });

    describe('parseRecharge', () => {
        it('returns no recharge for regular name', () => {
            const result = parseRecharge('Longsword');
            expect(result.hasRecharge).toBe(false);
            expect(result.cleanName).toBe('Longsword');
        });

        it('parses Recharge 5-6', () => {
            const result = parseRecharge('Breath Weapon (Recharge 5-6)');
            expect(result.hasRecharge).toBe(true);
            expect(result.rechargeValue).toBe(5);
            expect(result.cleanName).toBe('Breath Weapon');
        });

        it('parses Recharge 6', () => {
            const result = parseRecharge('Elemental Summons (Recharge 6)');
            expect(result.hasRecharge).toBe(true);
            expect(result.rechargeValue).toBe(6);
            expect(result.cleanName).toBe('Elemental Summons');
        });

        it('parses Recharge 4-6', () => {
            const result = parseRecharge('Fire Breath (Recharge 4-6)');
            expect(result.hasRecharge).toBe(true);
            expect(result.rechargeValue).toBe(4);
            expect(result.cleanName).toBe('Fire Breath');
        });

        it('handles empty input', () => {
            const result = parseRecharge('');
            expect(result.hasRecharge).toBe(false);
            expect(result.cleanName).toBe('');
        });

        it('handles null input', () => {
            const result = parseRecharge(null);
            expect(result.hasRecharge).toBe(false);
            expect(result.cleanName).toBe('');
        });

        it('parses 3/Day', () => {
            const result = parseRecharge('Protective Magic (3/Day)');
            expect(result.hasRecharge).toBe(false);
            expect(result.hasUses).toBe(true);
            expect(result.usesValue).toBe(3);
            expect(result.usesPeriod).toBe('day');
            expect(result.cleanName).toBe('Protective Magic');
        });

        it('parses 1/Day', () => {
            const result = parseRecharge('Innate Spellcasting (1/Day)');
            expect(result.hasUses).toBe(true);
            expect(result.usesValue).toBe(1);
            expect(result.usesPeriod).toBe('day');
            expect(result.cleanName).toBe('Innate Spellcasting');
        });

        it('parses 1/Short Rest', () => {
            const result = parseRecharge('Second Wind (1/Short Rest)');
            expect(result.hasUses).toBe(true);
            expect(result.usesValue).toBe(1);
            expect(result.usesPeriod).toBe('sr');
            expect(result.cleanName).toBe('Second Wind');
        });

        it('parses 1/Long Rest', () => {
            const result = parseRecharge('Divine Intervention (1/Long Rest)');
            expect(result.hasUses).toBe(true);
            expect(result.usesValue).toBe(1);
            expect(result.usesPeriod).toBe('lr');
            expect(result.cleanName).toBe('Divine Intervention');
        });

        it('parses 3/Day Each variant', () => {
            const result = parseRecharge('Spellcasting (3/Day Each)');
            expect(result.hasUses).toBe(true);
            expect(result.usesValue).toBe(3);
            expect(result.usesPeriod).toBe('day');
            expect(result.cleanName).toBe('Spellcasting');
        });
    });

    describe('parseTargeting', () => {
        it('returns empty result for null/empty', () => {
            expect(parseTargeting(null).areaType).toBeNull();
            expect(parseTargeting('').areaType).toBeNull();
        });

        it('parses 30-foot emanation', () => {
            const desc = '_Constitution Saving Throw_ DC 18, all hostile creatures in a 30-foot emanation of the Bugbear.';
            const result = parseTargeting(desc);

            expect(result.areaType).toBe('radius');
            expect(result.areaSize).toBe(30);
            expect(result.affectsType).toBe('enemy');
        });

        it('parses 15-foot cone', () => {
            const desc = 'Each creature in a 15-foot cone must make a Dexterity save.';
            const result = parseTargeting(desc);

            expect(result.areaType).toBe('cone');
            expect(result.areaSize).toBe(15);
        });

        it('parses 20-foot-radius sphere', () => {
            const desc = 'All creatures in a 20-foot-radius sphere must make a save.';
            const result = parseTargeting(desc);

            expect(result.areaType).toBe('sphere');
            expect(result.areaSize).toBe(20);
        });

        it('parses within range', () => {
            const desc = 'An allied creature the bugbear can see within 30 feet may use their reaction.';
            const result = parseTargeting(desc);

            expect(result.range).toBe(30);
            expect(result.affectsType).toBe('ally');
            expect(result.affectsCount).toBe(1);
        });

        it('parses between range', () => {
            const desc = '_Dexterity Saving Throw:_ DC 17, a creature between 50 and 500 feet away.';
            const result = parseTargeting(desc);

            expect(result.range).toBe(50);
            expect(result.longRange).toBe(500);
            expect(result.affectsType).toBe('creature');
            expect(result.affectsCount).toBe(1);
        });

        it('parses one creature target', () => {
            const desc = '_Dexterity Saving Throw:_ DC 16, one medium or smaller creature.';
            const result = parseTargeting(desc);

            expect(result.affectsType).toBe('creature');
            expect(result.affectsCount).toBe(1);
        });

        it('parses all creatures target', () => {
            const desc = 'All creatures within 10 feet must make a save.';
            const result = parseTargeting(desc);

            expect(result.affectsType).toBe('creature');
            expect(result.affectsCount).toBeNull();
        });

        it('parses each creature target', () => {
            const desc = 'Each creature in the area takes damage.';
            const result = parseTargeting(desc);

            expect(result.affectsType).toBe('creature');
            expect(result.affectsCount).toBeNull();
        });
    });

    describe('parseReactionTrigger', () => {
        it('returns no trigger for empty input', () => {
            expect(parseReactionTrigger(null).hasTrigger).toBe(false);
            expect(parseReactionTrigger('').hasTrigger).toBe(false);
        });

        it('returns no trigger for non-trigger description', () => {
            const desc = 'The creature can make an opportunity attack.';
            const result = parseReactionTrigger(desc);
            expect(result.hasTrigger).toBe(false);
        });

        it('parses trigger and response from Parry', () => {
            const desc = '_Trigger:_ The goblin is hit by a melee attack roll while holding a weapon. _Response:_ The goblin adds 3 to its AC against that attack.';
            const result = parseReactionTrigger(desc);

            expect(result.hasTrigger).toBe(true);
            expect(result.trigger).toBe('The goblin is hit by a melee attack roll while holding a weapon.');
            expect(result.response).toBe('The goblin adds 3 to its AC against that attack.');
        });

        it('parses trigger with save in response', () => {
            const desc = '_Trigger:_ A creature the goblin can see hits it with an attack roll. _Response:_ Wisdom Saving Throw DC 13, the triggering creature. Failure, the attack misses instead.';
            const result = parseReactionTrigger(desc);

            expect(result.hasTrigger).toBe(true);
            expect(result.trigger).toBe('A creature the goblin can see hits it with an attack roll.');
            expect(result.response).toContain('Wisdom Saving Throw DC 13');
        });

        it('handles multiline response', () => {
            const desc = '_Trigger:_ A creature hits the goblin. _Response:_ The goblin takes half damage and the attacker takes the other half.';
            const result = parseReactionTrigger(desc);

            expect(result.hasTrigger).toBe(true);
            expect(result.response).toBe('The goblin takes half damage and the attacker takes the other half.');
        });
    });

    describe('parseDamageFromDescription', () => {
        it('returns no damage for empty input', () => {
            expect(parseDamageFromDescription(null).hasDamage).toBe(false);
            expect(parseDamageFromDescription('').hasDamage).toBe(false);
        });

        it('parses parenthetical damage format', () => {
            const desc = 'The goblin deals an additional 2 (1d4) damage when it hits an attack with advantage.';
            const result = parseDamageFromDescription(desc);

            expect(result.hasDamage).toBe(true);
            expect(result.formula).toBe('1d4');
            expect(result.type).toBeNull();
        });

        it('parses damage with type', () => {
            const desc = 'The creature deals 3 (1d6) fire damage on a hit.';
            const result = parseDamageFromDescription(desc);

            expect(result.hasDamage).toBe(true);
            expect(result.formula).toBe('1d6');
            expect(result.type).toBe('fire');
        });

        it('parses simple dice damage', () => {
            const desc = 'Deals 2d6 radiant damage.';
            const result = parseDamageFromDescription(desc);

            expect(result.hasDamage).toBe(true);
            expect(result.formula).toBe('2d6');
            expect(result.type).toBe('radiant');
        });

        it('parses damage with bonus', () => {
            const desc = 'Takes 4 (1d6 + 1) poison damage.';
            const result = parseDamageFromDescription(desc);

            expect(result.hasDamage).toBe(true);
            expect(result.formula).toBe('1d6+1');
            expect(result.type).toBe('poison');
        });

        it('returns no damage for non-damage text', () => {
            const desc = 'The creature has advantage on saving throws.';
            const result = parseDamageFromDescription(desc);

            expect(result.hasDamage).toBe(false);
        });
    });
});
