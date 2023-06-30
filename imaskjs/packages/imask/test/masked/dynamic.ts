import assert from 'assert';
import { describe, it, beforeEach } from 'node:test';

import '../../src';
import MaskedDynamic from '../../src/masked/dynamic';
import { type MaskedPatternOptions } from '../../src/masked/pattern';


describe('MaskedDynamic', function () {
  const masked = new MaskedDynamic();

  beforeEach(function () {
    masked.updateOptions({ mask: [], dispatch: MaskedDynamic.DEFAULTS.dispatch });
    masked.unmaskedValue = '';
  });

  it('should dispatch pattern with fixed at end', function () {
    masked.updateOptions({
      mask: [
        {
          mask: '',
        },
        {
          mask: 'number $',
          lazy: false,
          blocks: {
            number: {
              mask: Number,
              thousandsSeparator: ',',
              radix: '.'
            }
          }
        },
      ],
    });
    masked.unmaskedValue = '1';
    assert.equal(masked.value, '1 $');

    masked.unmaskedValue = '';
    assert.equal(masked.value, '');
  });

  it('should handle eager option', function () {
    masked.updateOptions({
      mask: [
        {
          mask: '0"',
          eager: true,
        },
        {
          mask: '0[0]"',
          eager: true,
        },
      ],
    });
    masked.value = '1';
    assert.equal(masked.value, '1"');

    masked.value = '12';
    assert.equal(masked.value, '12"');
  });

  it('should handle flags correctly', function () {
    masked.updateOptions({
      mask: [
        {
          mask: '+00 {21} 0 000 0000',
          startsWith: '30',
          lazy: false,
          country: 'Greece'
        } as MaskedPatternOptions,
        {
          mask: '+0 000 000-00-00',
          startsWith: '7',
          lazy: false,
          country: 'Russia'
        } as MaskedPatternOptions,
        {
          mask: '0000000000000',
          startsWith: '',
          country: 'unknown'
        } as MaskedPatternOptions,
      ],
      dispatch: function (appended, dynamicMasked) {
        var number = (dynamicMasked.value + appended).replace(/\D/g,'');

        return dynamicMasked.compiledMasks.find(function (m) {
          return number.indexOf((m as any).startsWith) === 0;
        });
      }
    });
    masked.value = '70001234567';
    assert.equal((masked.currentMask as any).country, 'Russia');

    masked.splice(7, 1, '9');
    assert.equal(masked.unmaskedValue, '70009234567');
    assert.equal((masked.currentMask as any).country, 'Russia');
  });

  it('should update nested options', function () {
    const mask = [
      {
        mask: '0',
        lazy: true,
      },
    ];

    masked.updateOptions({ mask });
    masked.value = '';
    assert.equal(masked.value, '');

    masked.updateOptions({ mask: mask.map(m => ({ ...m, lazy: false })) });
    assert.equal(masked.value, '_');
  });

  it('should consider pattern tail for nested', function () {
    masked.updateOptions({
      mask: [
        {
          mask: '0`0',
          lazy: false,
        },
        {
          mask: '0`0`0',
          lazy: false,
        },
      ],
    });

    masked.unmaskedValue = '12';
    assert.equal(masked.value, '12');

    masked.splice(0, 1, '');
    assert.equal(masked.value, '_2');

    masked.unmaskedValue = '123';
    masked.splice(1, 1, '');

    assert.equal(masked.value, '1_3');
  });

  it('should consider input positions', function () {
    masked.updateOptions({
      mask: [
        {
          mask: '00`00',
          lazy: false,
        },
        {
          mask: '00`00`00',
          lazy: false,
        },
      ],
    });

    masked.value = '123456';
    masked.splice(2, 2, '');
    assert.equal(masked.value, '12__56');

    masked.splice(5, 1, '');
    assert.equal(masked.value, '12__5_');
  });
});
