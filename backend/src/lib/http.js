/** Throw from any route; the error middleware turns it into a JSON response. */
export class HttpError extends Error {
  status;
  details;
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (what = "Resource") => new HttpError(404, `${what} not found`);

export const forbidden = (msg = "You don't have access to this") => new HttpError(403, msg);
