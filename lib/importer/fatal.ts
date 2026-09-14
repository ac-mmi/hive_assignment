export class FatalImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FatalImportError";
  }
}
