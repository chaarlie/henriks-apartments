/** Invalidates late upload results after discard, replacement, or unmount. */
export class UploadGeneration {
  private current = 0;
  begin() { return ++this.current; }
  cancel() { this.current++; }
  accepts(run: number) { return run === this.current; }
}
