import assert from 'assert';
import { describe, it, beforeEach, mock } from 'node:test';

import MaskedPattern from '../../../src/masked/pattern';
import { DIRECTION } from '../../../src/core/utils';
import type MaskedNumber from '../../../src/masked/number';


describe('Insert', function () {
  const masked = new MaskedPattern({
    mask: '',
    lazy: false,
  });

  beforeEach(function () {
    masked.updateOptions({ mask: '', lazy: false, eager: false });
    masked.unmaskedValue = '';
  });

  it('should skip empty and consider dot', function () {
    masked.updateOptions({mask: '0{.}0'});
    masked.unmaskedValue = '.2';

    assert.equal(masked.value, '_.2');
  });

  it('should skip empty and not consider dot', function () {
    masked.updateOptions({mask: '0.0'});
    masked.unmaskedValue = '.2';

    assert.equal(masked.value, '_._');
  });

  it('should skip in lazy mode', function () {
    ['0.0', '0{.}0'].forEach(mask => {
      masked.updateOptions({mask, lazy: true});
      masked.unmaskedValue = '.2';
      assert.equal(masked.value, '2');
      masked.value = '.2';
      assert.equal(masked.value, '2');
    });
  });

  it('should not skip empty', function () {
    ['0.0', '0{.}0'].forEach(mask => {
      masked.updateOptions({mask});
      masked.value = '.2';
      assert.equal(masked.value, '2._');
    });
  });

  it('should consider equal fixed and skip not equal fixed', function () {
    masked.updateOptions({mask: '+{7}(000)000-00-00'});
    masked.value = '+79998887766';
    assert.equal(masked.unmaskedValue, '79998887766');
  });

  it('should prepare value before insert', function () {
    const prepareStub = mock.fn(v => v);
    masked.updateOptions({
      mask: '+{7}(000)000-00-00',
      prepareChar: prepareStub
    });
    masked.value = '+79998887766';
    assert.equal(prepareStub.mock.callCount(), 1);
  });

  it('should insert value in the middle', function () {
    masked.updateOptions({
      mask: '000',
    });
    masked.splice(1, 0, '1', DIRECTION.NONE);
    assert.equal(masked.value, '_1_');
  });

  it('should not skip blocks', function () {
    masked.updateOptions({
      mask: 'dw',
      lazy: true,
      blocks: {
        d: {
          mask: '00',
        },
        w: {
          mask: 'aa',
        },
      }
    });
    // should not jump over numbers
    masked.value = 'a';
    assert.equal(masked.value, '');
  });

  describe('RAW', function () {
    it('should set insert flag on fixed', function () {
      masked.updateOptions({mask: '+120'});
      masked.rawInputValue = '123';
      assert.equal(masked.rawInputValue, '123');

      masked.updateOptions({mask: '{+12}0'});
      masked.rawInputValue = '123';
      assert.equal(masked.rawInputValue, '123');
    });

    it('should keep trailing fixed on update options', function () {
      masked.updateOptions({mask: '0+'});
      masked.unmaskedValue = '11';
      assert.equal(masked.value, '1+');

      masked.updateOptions({ lazy: true });
      assert.equal(masked.value, '1+');
    });
  });

  describe('overwrite flag', function () {
    it('should shift value', function () {
      masked.updateOptions({ mask: '000', overwrite: 'shift' });
      masked.value = '123';
      assert.equal(masked.value, '123');

      masked.splice(0, 0, '0', DIRECTION.NONE);
      assert.equal(masked.value, '012');
    });

    it('should not shift if accepted', function () {
      masked.updateOptions({ mask: '00[aa]00', overwrite: 'shift' });
      masked.value = '1234';
      assert.equal(masked.value, '1234');

      masked.splice(2, 0, 'ab', DIRECTION.NONE);
      assert.equal(masked.value, '12ab34');
    });
  });

  describe('eager flag', function () {
    it('should correctly update value', function () {
      masked.updateOptions({
        mask: "+{3} 000",
        lazy: false,
        eager: true,
      });
      masked.value = masked.value;
      assert.equal(masked.value, '+3 ___');
    });
  });

  it('should set nested unmasked value', function () {
    masked.updateOptions({
      mask: '€ num',
      lazy: false,
      blocks: {
        num: {
          mask: Number,
          thousandsSeparator: ' ',
          radix: ',',
          mapToRadix: ['.'],
        },
      },
    });
    masked.unmaskedValue = '123.45';
    assert.equal(masked.value, '€ 123,45');

    (masked.maskedBlock('num') as MaskedNumber).updateOptions({ thousandsSeparator: '.' });
    assert.equal(masked.value, '€ 123,45');

    masked.unmaskedValue = '123.45';
    assert.equal(masked.value, '€ 123,45');
  });

  describe('secure text entry', function () {
    it('should hide value', function () {
      masked.updateOptions({
        mask: 'XXX-XX-0000',
        definitions: {
          X: {
            mask: '0',
            displayChar: 'X',
            placeholderChar: '#',
          },
        },
      });
      masked.unmaskedValue = '123456789';

      assert.equal(masked.value, '123-45-6789');
      assert.equal(masked.displayValue, 'XXX-XX-6789');
    });
  });

  describe('definitions', function () {
    it('should work', function () {
      masked.updateOptions({
        mask: '#00000',
        definitions: {
          '#': /[1-6]/,
        },
      });
      masked.unmaskedValue = '123456';

      assert.equal(masked.unmaskedValue, '123456');
      assert.equal(masked.value, '123456');
    });
  });
});
