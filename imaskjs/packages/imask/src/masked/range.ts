import ChangeDetails from '../core/change-details';
import IMask from '../core/holder';
import { type AppendFlags } from './base';
import MaskedPattern, { type MaskedPatternOptions } from './pattern';


type MaskedRangePatternOptions = MaskedPatternOptions &
  Pick<MaskedRange, 'from' | 'to' | 'autofix'> &
  Partial<Pick<MaskedRange, 'maxLength'>>;

export
type MaskedRangeOptions = Omit<MaskedRangePatternOptions, 'mask'>;


/** Pattern which accepts ranges */
export default
class MaskedRange extends MaskedPattern {
  /**
    Optionally sets max length of pattern.
    Used when pattern length is longer then `to` param length. Pads zeros at start in this case.
  */
  declare maxLength: number;
  /** Min bound */
  declare from: number;
  /** Max bound */
  declare to: number;
  /** */
  declare autofix?: boolean | 'pad';

  get _matchFrom (): number {
    return this.maxLength - String(this.from).length;
  }

  constructor (opts?: MaskedRangeOptions) {
    super(opts as MaskedPatternOptions); // mask will be created in _update
  }

  override updateOptions (opts: Partial<MaskedRangeOptions>) {
    super.updateOptions(opts);
  }

  override _update (opts: Partial<MaskedRangeOptions>) {
    const {
      to=this.to || 0,
      from=this.from || 0,
      maxLength=this.maxLength || 0,
      autofix=this.autofix,
      ...patternOpts
    }: Partial<MaskedRangePatternOptions> = opts;

    this.to = to;
    this.from = from;
    this.maxLength = Math.max(String(to).length, maxLength);
    this.autofix = autofix;

    const fromStr = String(this.from).padStart(this.maxLength, '0');
    const toStr = String(this.to).padStart(this.maxLength, '0');
    let sameCharsCount = 0;
    while (sameCharsCount < toStr.length && toStr[sameCharsCount] === fromStr[sameCharsCount]) ++sameCharsCount;
    patternOpts.mask = toStr.slice(0, sameCharsCount).replace(/0/g, '\\0') + '0'.repeat(this.maxLength - sameCharsCount);

    super._update(patternOpts);
  }

  override get isComplete (): boolean {
    return super.isComplete && Boolean(this.value);
  }

  boundaries (str: string): [string, string] {
    let minstr = '';
    let maxstr = '';

    const [, placeholder, num] = str.match(/^(\D*)(\d*)(\D*)/) || [];
    if (num) {
      minstr = '0'.repeat(placeholder.length) + num;
      maxstr = '9'.repeat(placeholder.length) + num;
    }
    minstr = minstr.padEnd(this.maxLength, '0');
    maxstr = maxstr.padEnd(this.maxLength, '9');

    return [minstr, maxstr];
  }

  override doPrepareChar (ch: string, flags: AppendFlags={}): [string, ChangeDetails] {
    let details: ChangeDetails;
    [ch, details] = super.doPrepareChar(ch.replace(/\D/g, ''), flags);

    if (!this.autofix || !ch) return [ch, details];

    const fromStr = String(this.from).padStart(this.maxLength, '0');
    const toStr = String(this.to).padStart(this.maxLength, '0');

    const nextVal = this.value + ch;
    if (nextVal.length > this.maxLength) return ['', details];

    const [minstr, maxstr] = this.boundaries(nextVal);

    if (Number(maxstr) < this.from) return [fromStr[nextVal.length - 1], details];

    if (Number(minstr) > this.to) {
      if (this.autofix === 'pad' && nextVal.length < this.maxLength) {
        return ['', details.aggregate(this.append(fromStr[nextVal.length - 1]+ch, flags))];
      }
      return [toStr[nextVal.length - 1], details];
    }

    return [ch, details];
  }

  override doValidate (flags: AppendFlags): boolean {
    const str = this.value;

    const firstNonZero = str.search(/[^0]/);
    if (firstNonZero === -1 && str.length <= this._matchFrom) return true;

    const [minstr, maxstr] = this.boundaries(str);

    return this.from <= Number(maxstr) && Number(minstr) <= this.to &&
      super.doValidate(flags);
  }
}


IMask.MaskedRange = MaskedRange;
